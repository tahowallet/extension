import { StatusCodes, TransportStatusError } from "@ledgerhq/errors"
import InternalSignerService, {
  Keyring,
  KeyringAccountSigner,
  PrivateKey,
  PrivateKeyAccountSigner,
} from "../internal-signer"
import LedgerService, { LedgerAccountSigner } from "../ledger"
import {
  EVMNetwork,
  SignedTransaction,
  TransactionRequest,
  TransactionRequestWithNonce,
  sameAddressFormat,
  sameNetwork,
} from "../../networks"
import type {
  EIP712TypedData,
  HexString,
  NormalizedEVMAddress,
} from "../../types"
import BaseService from "../base"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import ChainService from "../chain"
import type NameService from "../name"
import type { AddressOnNetwork, NameOnNetwork } from "../../accounts"
import { assertUnreachable } from "../../lib/utils/type-guards"
import { normalizeEVMAddress } from "../../lib/utils"
import logger from "../../lib/logger"
import { getOrCreateDB, InternalSignerAddressRow, SigningDatabase } from "./db"

type SigningErrorReason = "userRejected" | "genericError"
type ErrorResponse = {
  type: "error"
  reason: SigningErrorReason
}

export type TXSignatureResponse =
  | {
      type: "success-tx"
      signedTx: SignedTransaction
    }
  | ErrorResponse

export type SignatureResponse =
  | {
      type: "success-data"
      signedData: string
    }
  | ErrorResponse

/**
 * For each of the user's addresses, and each chain ID it's tracked on, the
 * other chain IDs it's tracked on that it's known to be control-compatible
 * with. See RFB 5.
 */
export type ControlCompatibility = {
  [address: NormalizedEVMAddress]: { [chainID: string]: string[] }
}

type Events = ServiceLifecycleEvents & {
  signingTxResponse: TXSignatureResponse
  signingDataResponse: SignatureResponse
  personalSigningResponse: SignatureResponse
  controlCompatibility: ControlCompatibility
}

/**
 * An AccountSigner that represents a read-only account. Read-only accounts
 * generally cannot sign.
 */
export const ReadOnlyAccountSigner = { type: "read-only" } as const

/**
 * An AccountSigner carries the appropriate information for a given signer to
 * act on a signing request. The `type` field always carries the signer type,
 * but the rest of the object is signer-specific and should be treated as
 * opaque outside of the specific signer's service.
 */
export type AccountSigner =
  | typeof ReadOnlyAccountSigner
  | PrivateKeyAccountSigner
  | KeyringAccountSigner
  | HardwareAccountSigner
export type HardwareAccountSigner = LedgerAccountSigner

export type SignerType = AccountSigner["type"]

type AddressHandler = {
  address: string
  signer: SignerType
}

/**
 * Builds one registry row per address the internal signer can sign for. When
 * an address is covered by both a keyring and a private key, the keyring is
 * kept, matching the priority used by the account signer selectors.
 */
function internalSignerAddressRows({
  privateKeys,
  keyrings,
}: {
  privateKeys: PrivateKey[]
  keyrings: Keyring[]
}): InternalSignerAddressRow[] {
  const rows = new Map<NormalizedEVMAddress, InternalSignerAddressRow>()

  privateKeys.forEach(({ id, addresses: [address] }) => {
    const normalized = normalizeEVMAddress(address)
    rows.set(normalized, {
      address: normalized,
      signer: { type: "private-key", walletID: id },
    })
  })

  keyrings.forEach(({ id, addresses }) => {
    addresses.forEach((address) => {
      const normalized = normalizeEVMAddress(address)
      rows.set(normalized, {
        address: normalized,
        signer: { type: "keyring", keyringID: id },
      })
    })
  })

  return [...rows.values()]
}

function getSigningErrorReason(err: unknown): SigningErrorReason {
  if (err instanceof TransportStatusError) {
    const transportError = err as Error & { statusCode: number }
    switch (transportError.statusCode) {
      case StatusCodes.CONDITIONS_OF_USE_NOT_SATISFIED:
        return "userRejected"
      default:
    }
  }

  return "genericError"
}

/**
 * The SigningService is intended hide and demultiplex of accesses
 * to concrete signer implementations.
 *
 * It also emits all the abstract signing-related event to subscribers
 * grabbing this responsibility from each different implementation.
 *
 */
export default class SigningService extends BaseService<Events> {
  addressHandlers: AddressHandler[] = []

  // Control compatibility recomputes are coalesced: a trigger schedules one
  // run on the next tick, and triggers that land during a run cause one more.
  private controlCompatibilityScheduled = false
  private controlCompatibilityRunning = false
  private controlCompatibilityStale = false

  static create: ServiceCreatorFunction<
    Events,
    SigningService,
    [
      Promise<InternalSignerService>,
      Promise<LedgerService>,
      Promise<ChainService>,
      Promise<NameService>,
    ]
  > = async (internalSignerService, ledgerService, chainService, nameService) =>
    new this(
      await internalSignerService,
      await ledgerService,
      await chainService,
      await nameService,
      await getOrCreateDB(),
    )

  private constructor(
    private internalSignerService: InternalSignerService,
    private ledgerService: LedgerService,
    private chainService: ChainService,
    private nameService: NameService,
    private db: SigningDatabase,
  ) {
    super()

    this.internalSignerService.emitter.on(
      "internalSigners",
      async (signers) => {
        // A locked internal signer emits empty signer lists. Those say nothing
        // about which addresses are signable, so the registry is kept as is.
        if (this.internalSignerService.locked()) {
          return
        }

        try {
          // Rows are built synchronously so that writes happen in event order.
          await this.db.replaceAll(internalSignerAddressRows(signers))
        } catch (error) {
          logger.error("Error updating internal signer address registry", error)
        }
        this.scheduleControlCompatibilityUpdate()
      },
    )

    // Each of these can change the tracked accounts or networks that
    // compatibility is computed over.
    this.chainService.emitter.on("newAccountToTrack", () =>
      this.scheduleControlCompatibilityUpdate(),
    )
    this.chainService.emitter.on("networkSubscribed", () =>
      this.scheduleControlCompatibilityUpdate(),
    )
    this.chainService.emitter.on("customChainAdded", () =>
      this.scheduleControlCompatibilityUpdate(),
    )
    // The Ledger registry is written after an address is derived, so this run
    // may not see the new account. The newAccountToTrack run that follows the
    // write does.
    this.ledgerService.emitter.on("address", () =>
      this.scheduleControlCompatibilityUpdate(),
    )
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    this.scheduleControlCompatibilityUpdate()
  }

  /**
   * Computes control compatibility for every tracked address, checking each
   * pair of networks that address is tracked on. Only signer-based conditions
   * apply, so this makes no network calls. See RFB 5.
   */
  async getControlCompatibility(): Promise<ControlCompatibility> {
    const networksByAddress = new Map<NormalizedEVMAddress, EVMNetwork[]>()
    const accounts = await this.chainService.getAccountsToTrack()
    accounts.forEach(({ address, network }) => {
      const normalizedAddress = normalizeEVMAddress(address)
      const networks = networksByAddress.get(normalizedAddress) ?? []
      if (!networks.some(({ chainID }) => chainID === network.chainID)) {
        networks.push(network)
      }
      networksByAddress.set(normalizedAddress, networks)
    })

    const controlCompatibility: ControlCompatibility = {}
    await Promise.all(
      [...networksByAddress].map(async ([address, networks]) => {
        // Signers don't depend on the pair of networks, so read them once.
        const signers = await this.getSignersForAddress(address)

        const compatibilityByChainID: { [chainID: string]: string[] } = {}
        networks.forEach((network) => {
          compatibilityByChainID[network.chainID] = networks
            .filter(
              (otherNetwork) =>
                otherNetwork.chainID !== network.chainID &&
                (sameNetwork(network, otherNetwork) ||
                  (sameAddressFormat(network, otherNetwork) &&
                    this.hasTransactionCompatibleSigner(
                      signers,
                      network,
                      otherNetwork,
                    ))),
            )
            .map(({ chainID }) => chainID)
        })

        controlCompatibility[address] = compatibilityByChainID
      }),
    )

    return controlCompatibility
  }

  private scheduleControlCompatibilityUpdate(): void {
    if (this.controlCompatibilityScheduled) {
      return
    }
    this.controlCompatibilityScheduled = true

    setTimeout(() => {
      this.controlCompatibilityScheduled = false
      void this.runControlCompatibilityUpdate()
    }, 0)
  }

  private async runControlCompatibilityUpdate(): Promise<void> {
    if (this.controlCompatibilityRunning) {
      this.controlCompatibilityStale = true
      return
    }

    this.controlCompatibilityRunning = true
    try {
      do {
        this.controlCompatibilityStale = false
        try {
          const controlCompatibility = await this.getControlCompatibility()
          this.emitter.emit("controlCompatibility", controlCompatibility)
        } catch (error) {
          logger.error("Error computing control compatibility", error)
        }
      } while (this.controlCompatibilityStale)
    } finally {
      this.controlCompatibilityRunning = false
    }
  }

  async deriveAddress(signerID: AccountSigner): Promise<HexString> {
    if (signerID.type === "ledger") {
      return this.ledgerService.deriveAddress(signerID)
    }

    if (signerID.type === "keyring") {
      return this.internalSignerService.deriveAddress(signerID)
    }

    throw new Error(`Unknown signerID: ${signerID}`)
  }

  /**
   * Returns the signers that can sign for `address`. Internal signers come from
   * the persisted registry, so this works while the internal signer is locked.
   */
  async getSignersForAddress(address: HexString): Promise<AccountSigner[]> {
    const normalizedAddress = normalizeEVMAddress(address)
    const signers: AccountSigner[] = []

    const internalSignerRow = await this.db.getByAddress(normalizedAddress)
    if (internalSignerRow !== null) {
      signers.push(internalSignerRow.signer)
    }

    const ledgerAccount =
      await this.ledgerService.getAccountByAddress(normalizedAddress)
    if (ledgerAccount !== null) {
      signers.push({
        type: "ledger",
        deviceID: ledgerAccount.ledgerId,
        path: ledgerAccount.path,
      })
    }

    return signers
  }

  /**
   * Returns true if `objectOnNetwork` (an address or a name) is control
   * compatible with `otherNetwork`, meaning a signer that controls it on its
   * own network can also control it on `otherNetwork`. See RFB 5.
   */
  async isControlCompatible(
    objectOnNetwork: AddressOnNetwork | NameOnNetwork,
    otherNetwork: EVMNetwork,
  ): Promise<boolean> {
    const { network } = objectOnNetwork

    if (sameNetwork(network, otherNetwork)) {
      return true
    }

    if (!sameAddressFormat(network, otherNetwork)) {
      return false
    }

    let address: HexString
    if ("name" in objectOnNetwork) {
      const record =
        await this.nameService.lookUpEthereumAddress(objectOnNetwork)
      if (record === undefined) {
        return false
      }
      address = record.resolved.addressOnNetwork.address
    } else {
      address = objectOnNetwork.address
    }

    const signers = await this.getSignersForAddress(address)
    if (this.hasTransactionCompatibleSigner(signers, network, otherNetwork)) {
      return true
    }

    if ("name" in objectOnNetwork) {
      return this.nameService.isNameOwnershipCompatible(
        objectOnNetwork,
        otherNetwork,
      )
    }

    return false
  }

  /**
   * Returns true if any of `signers` can sign transactions for both networks.
   * Synchronous, so callers that check many network pairs for one address can
   * read its signers once. Assumes the networks have the same address format.
   */
  private hasTransactionCompatibleSigner(
    signers: AccountSigner[],
    network: EVMNetwork,
    otherNetwork: EVMNetwork,
  ): boolean {
    return signers.some((signer) => {
      switch (signer.type) {
        case "keyring":
        case "private-key":
          return this.internalSignerService.isTransactionCompatible(
            network,
            otherNetwork,
          )
        case "ledger":
          return this.ledgerService.isTransactionCompatible(
            network,
            otherNetwork,
          )
        case "read-only":
          return false
        default:
          return assertUnreachable(signer)
      }
    })
  }

  private async signTransactionWithNonce(
    transactionWithNonce: TransactionRequestWithNonce,
    accountSigner: AccountSigner,
  ): Promise<SignedTransaction> {
    switch (accountSigner.type) {
      case "ledger":
        return this.ledgerService.signTransaction(
          transactionWithNonce,
          accountSigner,
        )
      case "private-key":
      case "keyring":
        return this.internalSignerService.signTransaction(
          {
            address: transactionWithNonce.from,
            network: transactionWithNonce.network,
          },
          transactionWithNonce,
        )
      case "read-only":
        throw new Error("Read-only signers cannot sign.")
      default:
        return assertUnreachable(accountSigner)
    }
  }

  async removeAccount(
    address: HexString,
    signerType?: SignerType,
  ): Promise<void> {
    if (signerType) {
      switch (signerType) {
        case "private-key":
        case "keyring":
          await this.internalSignerService.removeAccount(address)
          break
        case "ledger":
          await this.ledgerService.removeAddress(address)
          break
        case "read-only":
          break // no additional work here, just account removal below
        default:
          assertUnreachable(signerType)
      }
    }
    await this.chainService.removeAccountToTrack(address)

    this.scheduleControlCompatibilityUpdate()
  }

  /**
   * Requests that signers prepare for a signing request. For hardware wallets
   * in particular, this can include refreshing connection information so that
   * the status is up to date. For remote wallets, e.g. WalletConnect, it can
   * include connection setup.
   *
   * Currently this method does not take information about the request, but if
   * the required setup is expensive enough, the `from` address can be passed
   * in so that signers are only set up when the request applies to them.
   */
  async prepareForSigningRequest(): Promise<void> {
    // Refresh connected Ledger info indiscriminately. No real harm vs doing it
    // only under certain circumstances, might even be more performant than
    // testing whether the Ledger can sign for the requested `from` address.
    await this.ledgerService.refreshConnectedLedger()
  }

  async signTransaction(
    transactionRequest: TransactionRequest,
    accountSigner: AccountSigner,
  ): Promise<SignedTransaction> {
    const transactionWithNonce =
      await this.chainService.populateEVMTransactionNonce(transactionRequest)

    try {
      const signedTx = await this.signTransactionWithNonce(
        transactionWithNonce,
        accountSigner,
      )

      this.emitter.emit("signingTxResponse", {
        type: "success-tx",
        signedTx,
      })

      return signedTx
    } catch (err) {
      this.emitter.emit("signingTxResponse", {
        type: "error",
        reason: getSigningErrorReason(err),
      })

      this.chainService.releaseEVMTransactionNonce(transactionWithNonce)

      throw err
    }
  }

  addTrackedAddress(address: string, handler: SignerType): void {
    this.addressHandlers.push({ address, signer: handler })
  }

  async signTypedData({
    typedData,
    account,
    accountSigner,
  }: {
    typedData: EIP712TypedData
    account: AddressOnNetwork
    accountSigner: AccountSigner
  }): Promise<string> {
    try {
      let signedData: string
      const chainId =
        typeof typedData.domain.chainId === "string"
          ? // oxlint-disable-next-line radix
            parseInt(typedData.domain.chainId)
          : typedData.domain.chainId
      if (
        typedData.domain.chainId !== undefined &&
        // Let parseInt infer radix by prefix; chainID can be hex or decimal,
        // though it should generally be hex.
        // oxlint-disable-next-line radix
        chainId !== parseInt(account.network.chainID)
      ) {
        throw new Error(
          "Attempting to sign typed data with mismatched chain IDs.",
        )
      }

      switch (accountSigner.type) {
        case "ledger":
          signedData = await this.ledgerService.signTypedData(
            typedData,
            account.address,
            accountSigner,
          )
          break
        case "private-key":
        case "keyring":
          signedData = await this.internalSignerService.signTypedData({
            typedData,
            account: account.address,
          })
          break
        case "read-only":
          throw new Error("Read-only signers cannot sign.")
        default:
          assertUnreachable(accountSigner)
      }
      this.emitter.emit("signingDataResponse", {
        type: "success-data",
        signedData,
      })

      return signedData
    } catch (err) {
      this.emitter.emit("signingDataResponse", {
        type: "error",
        reason: getSigningErrorReason(err),
      })

      throw err
    }
  }

  async signData(
    addressOnNetwork: AddressOnNetwork,
    hexDataToSign: HexString,
    accountSigner: AccountSigner,
  ): Promise<string> {
    if (!hexDataToSign.startsWith("0x")) {
      throw new Error("Signing service can only sign hex data.")
    }

    try {
      let signedData
      switch (accountSigner.type) {
        case "ledger":
          signedData = await this.ledgerService.signMessage(
            addressOnNetwork,
            hexDataToSign,
            accountSigner,
          )
          break
        case "private-key":
        case "keyring":
          signedData = await this.internalSignerService.personalSign({
            signingData: hexDataToSign,
            account: addressOnNetwork.address,
          })
          break
        case "read-only":
          throw new Error("Read-only signers cannot sign.")
        default:
          assertUnreachable(accountSigner)
      }

      this.emitter.emit("personalSigningResponse", {
        type: "success-data",
        signedData,
      })
      return signedData
    } catch (err) {
      if (err instanceof TransportStatusError) {
        const transportError = err as Error & { statusCode: number }
        switch (transportError.statusCode) {
          case StatusCodes.CONDITIONS_OF_USE_NOT_SATISFIED:
            this.emitter.emit("personalSigningResponse", {
              type: "error",
              reason: "userRejected",
            })
            throw err
          default:
            break
        }
      }
      this.emitter.emit("personalSigningResponse", {
        type: "error",
        reason: "genericError",
      })
      throw err
    }
  }
}
