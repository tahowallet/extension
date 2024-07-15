import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import Eth from "@ledgerhq/hw-app-eth"
import { DeviceModelId } from "@ledgerhq/devices"
import {
  serialize,
  UnsignedTransaction,
  parse as parseRawTransaction,
} from "@ethersproject/transactions"
import {
  joinSignature,
  _TypedDataEncoder,
  getAddress as ethersGetAddress,
} from "ethers/lib/utils"
import {
  isEIP1559TransactionRequest,
  isKnownTxType,
  SignedTransaction,
  TransactionRequestWithNonce,
} from "../../networks"
import { EIP712TypedData, HexString } from "../../types"
import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import logger from "../../lib/logger"
import { getOrCreateDB, LedgerAccount, LedgerDatabase } from "./db"
import { ethersTransactionFromTransactionRequest } from "../chain/utils"
import { ETHEREUM } from "../../constants"
import { normalizeEVMAddress } from "../../lib/utils"
import { AddressOnNetwork } from "../../accounts"

enum LedgerType {
  UNKNOWN,
  LEDGER_NANO_S,
  LEDGER_NANO_X,
  LEDGER_NANO_S_PLUS,
}

const LedgerTypeAsString = Object.values(LedgerType)

export type LedgerAccountSigner = {
  type: "ledger"
  deviceID: string
  path: string
}

export const LedgerProductDatabase = {
  LEDGER_NANO_S: { productId: 0x1015 },
  LEDGER_NANO_X: { productId: 0x4015 },
  LEDGER_NANO_S_PLUS: { productId: 0x5015 },
}

export const isLedgerSupported = typeof navigator.usb === "object"

const TestedProductId = (productId: number): boolean =>
  Object.values(LedgerProductDatabase).some((e) => e.productId === productId)

/**
 * Metadata details about the display of a given Ledger device.
 */
export type DisplayDetails = {
  /**
   * When confirming a message for signing, the length of the message that the
   * Ledger will display before cutting it off.
   */
  messageSigningDisplayLength: number
}

const DisplayDetailsByLedgerType: {
  [ledgerType in LedgerType]: DisplayDetails
} = {
  [LedgerType.UNKNOWN]: { messageSigningDisplayLength: 0 },
  [LedgerType.LEDGER_NANO_S]: { messageSigningDisplayLength: 99 },
  [LedgerType.LEDGER_NANO_X]: { messageSigningDisplayLength: 255 },
  [LedgerType.LEDGER_NANO_S_PLUS]: { messageSigningDisplayLength: 255 },
}

type MetaData = {
  ethereumVersion: string
  isArbitraryDataSigningEnabled: boolean
  displayDetails: DisplayDetails
}

export type ConnectedDevice = {
  id: string
  type: LedgerType
  metadata: MetaData
}

type Events = ServiceLifecycleEvents & {
  ledgerAdded: {
    id: string
    type: LedgerType
    accountIDs: string[]
    metadata: MetaData
  }
  ledgerAccountAdded: {
    id: string
    ledgerID: string
    derivationPath: string
    addresses: HexString[]
  }
  connected: ConnectedDevice
  disconnected: { id: string; type: LedgerType }
  address: { ledgerID: string; derivationPath: string; address: HexString }
  signedTransaction: SignedTransaction
  signedData: string
  usbDeviceCount: number
}

export const idDerivationPath = "44'/60'/0'/0/0"

async function deriveAddressOnLedger(path: string, eth: Eth) {
  const derivedIdentifiers = await eth.getAddress(path)
  const address = ethersGetAddress(derivedIdentifiers.address)
  return address
}

async function generateLedgerId(
  transport: Transport,
  eth: Eth,
): Promise<[string | undefined, LedgerType]> {
  let extensionDeviceType = LedgerType.UNKNOWN

  if (!transport.deviceModel) {
    throw new Error("Missing device model descriptor!")
  }

  switch (transport.deviceModel.id) {
    case DeviceModelId.nanoS:
      extensionDeviceType = LedgerType.LEDGER_NANO_S
      break
    case DeviceModelId.nanoX:
      extensionDeviceType = LedgerType.LEDGER_NANO_X
      break
    case DeviceModelId.nanoSP:
      extensionDeviceType = LedgerType.LEDGER_NANO_S_PLUS
      break
    default:
      extensionDeviceType = LedgerType.UNKNOWN
  }

  if (extensionDeviceType === LedgerType.UNKNOWN) {
    return [undefined, extensionDeviceType]
  }

  const address = await deriveAddressOnLedger(idDerivationPath, eth)

  return [address, extensionDeviceType]
}

/**
 * The LedgerService is responsible for exposing the functionality of
 * Ledger devices in a digestible form by other services
 *
 * To do so, it does:
 *   - serialize the calls to the critical resource (ie. Ledger)
 *   - acts when a paired device is (dis-)connected
 *   - supports address derivation from BIP32 paths
 *   - supports transaction signing
 *   - supports typed data signing
 *   - maps the successfully onboarded addresses to their derivation paths
 *
 * Known issues
 *   - this service's kryptonite is having multiple browser-paired Ledgers
 *     connected to the computer. In that case the Wallet doesn't know
 *     which device will respond to its requests
 */
export default class LedgerService extends BaseService<Events> {
  #currentLedgerId: string | null = null

  transport: Transport | undefined = undefined

  #lastOperationPromise = Promise.resolve()

  static create: ServiceCreatorFunction<Events, LedgerService, []> = async () =>
    new this(await getOrCreateDB())

  private constructor(private db: LedgerDatabase) {
    super()
  }

  private runSerialized<T>(operation: () => Promise<T>) {
    const oldOperationPromise = this.#lastOperationPromise
    const newOperationPromise = oldOperationPromise.then(async () =>
      operation(),
    )

    this.#lastOperationPromise = newOperationPromise.then(
      () => {},
      () => {},
    )

    return newOperationPromise
  }

  async onConnection(productId: number): Promise<void> {
    return this.runSerialized(async () => {
      if (!TestedProductId(productId)) {
        return
      }

      try {
        this.transport = await TransportWebUSB.create()

        const eth = new Eth(this.transport)

        const [id, type] = await generateLedgerId(this.transport, eth)

        if (!id) {
          throw new Error("Can't derive meaningful identification address!")
        }

        const appData = await eth.getAppConfiguration()

        const normalizedID = normalizeEVMAddress(id)

        this.#currentLedgerId = `${LedgerTypeAsString[type]}_${normalizedID}`

        this.emitter.emit("connected", {
          id: this.#currentLedgerId,
          type,
          metadata: {
            ethereumVersion: appData.version,
            isArbitraryDataSigningEnabled: appData.arbitraryDataEnabled !== 0,
            displayDetails: DisplayDetailsByLedgerType[type],
          },
        })

        const knownAddresses = await this.db.getAllAccountsByLedgerId(
          this.#currentLedgerId,
        )

        if (!knownAddresses.length) {
          this.emitter.emit("ledgerAdded", {
            id: this.#currentLedgerId,
            type,
            accountIDs: [idDerivationPath],
            metadata: {
              ethereumVersion: appData.version,
              isArbitraryDataSigningEnabled: appData.arbitraryDataEnabled !== 0,
              displayDetails: DisplayDetailsByLedgerType[type],
            },
          })
        }
      } catch (error) {
        logger.error(
          "Treating Ledger as having disconnected due to a connection error:",
          error,
        )
        await this.#handleUSBDisconnect()
      }
    })
  }

  #handleUSBConnect = async (event: USBConnectionEvent): Promise<void> => {
    this.emitter.emit(
      "usbDeviceCount",
      (await navigator.usb.getDevices()).length,
    )
    if (!TestedProductId(event.device.productId)) {
      return
    }

    this.onConnection(event.device.productId)
  }

  #handleUSBDisconnect =
    async (/* event: USBConnectionEvent */): Promise<void> => {
      this.emitter.emit(
        "usbDeviceCount",
        (await navigator.usb.getDevices()).length,
      )
      if (!this.#currentLedgerId) {
        return
      }

      this.emitter.emit("disconnected", {
        id: this.#currentLedgerId,
        type: LedgerType.LEDGER_NANO_S,
      })

      this.#currentLedgerId = null
    }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    this.refreshConnectedLedger()

    navigator.usb.addEventListener("connect", this.#handleUSBConnect)
    navigator.usb.addEventListener("disconnect", this.#handleUSBDisconnect)
  }

  protected override async internalStopService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    navigator.usb.removeEventListener("disconnect", this.#handleUSBDisconnect)
    navigator.usb.removeEventListener("connect", this.#handleUSBConnect)
  }

  async refreshConnectedLedger(): Promise<string | null> {
    const usbDeviceArray = await navigator.usb.getDevices()

    this.emitter.emit("usbDeviceCount", usbDeviceArray.length)

    if (usbDeviceArray.length === 0 || usbDeviceArray.length > 1) {
      return null // Nasty things may happen when we've got zero or multiple choices
    }

    if (usbDeviceArray.length === 1) {
      await this.onConnection(usbDeviceArray[0].productId)
    }

    return this.#currentLedgerId
  }

  async deriveAddress({
    // FIXME Use deviceID.
    path: derivationPath,
  }: LedgerAccountSigner): Promise<HexString> {
    return this.runSerialized(async () => {
      try {
        if (!this.transport) {
          throw new Error("Uninitialized transport!")
        }

        if (!this.#currentLedgerId) {
          throw new Error("Uninitialized Ledger ID!")
        }

        const eth = new Eth(this.transport)

        const accountAddress = normalizeEVMAddress(
          await deriveAddressOnLedger(derivationPath, eth),
        )

        this.emitter.emit("address", {
          ledgerID: this.#currentLedgerId,
          derivationPath,
          address: accountAddress,
        })

        return accountAddress
      } catch (err) {
        logger.error(
          `Error encountered deriving address at path ${derivationPath}! ledgerID: ${
            this.#currentLedgerId
          } error: ${err}`,
        )
        throw err
      }
    })
  }

  async saveAddress(path: HexString, address: string): Promise<void> {
    if (!this.#currentLedgerId) {
      throw new Error("No Ledger id is set!")
    }

    await this.db.addAccount({ ledgerId: this.#currentLedgerId, path, address })
  }

  async removeAddress(address: HexString): Promise<void> {
    await this.db.removeAccount(address)
  }

  async getAccountByAddress(address: HexString): Promise<LedgerAccount | null> {
    const ledgerAccount = await this.db.getAccountByAddress(address)
    return ledgerAccount
  }

  async signTransaction(
    transactionRequest: TransactionRequestWithNonce,
    { deviceID, path: derivationPath }: LedgerAccountSigner,
  ): Promise<SignedTransaction> {
    return this.runSerialized(async () => {
      try {
        if (!this.transport) {
          throw new Error("Uninitialized transport!")
        }

        if (!this.#currentLedgerId) {
          throw new Error("Uninitialized Ledger ID!")
        }

        const ethersTx =
          ethersTransactionFromTransactionRequest(transactionRequest)

        let serializableEthersTx = ethersTx

        if (!isEIP1559TransactionRequest(ethersTx)) {
          // Ethers does not permit "from" field when serializing legacy transaction requests
          const { from: _, ...fieldsWithoutFrom } = ethersTx
          serializableEthersTx = fieldsWithoutFrom
        }

        const serializedTx = serialize(
          serializableEthersTx as UnsignedTransaction,
        ).substring(2) // serialize adds 0x prefix which kills Eth::signTransaction

        const accountData = await this.db.getAccountByAddress(
          transactionRequest.from,
        )

        this.checkCanSign(accountData, derivationPath, deviceID)

        const eth = new Eth(this.transport)
        const signature = await eth.signTransaction(
          derivationPath,
          serializedTx,
          null,
        )

        const signedTransaction = serialize(
          serializableEthersTx as UnsignedTransaction,
          {
            r: `0x${signature.r}`,
            s: `0x${signature.s}`,
            v: parseInt(signature.v, 16),
          },
        )
        const tx = parseRawTransaction(signedTransaction)

        if (
          !tx.hash ||
          !tx.from ||
          !tx.r ||
          !tx.s ||
          typeof tx.v === "undefined"
        ) {
          throw new Error("Transaction doesn't appear to have been signed.")
        }

        if (tx.type !== null && !isKnownTxType(tx.type)) {
          throw new Error(`Unknown transaction type ${tx.type}`)
        }

        const signedTx = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          nonce: tx.nonce,
          input: tx.data,
          value: tx.value.toBigInt(),
          type: tx.type,
          gasPrice: tx.gasPrice ? tx.gasPrice.toBigInt() : null,
          maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toBigInt() : null,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas
            ? tx.maxPriorityFeePerGas.toBigInt()
            : null,
          gasLimit: tx.gasLimit.toBigInt(),
          r: tx.r,
          s: tx.s,
          v: tx.v,
          blockHash: null,
          blockHeight: null,
          asset: transactionRequest.network.baseAsset,
          network: transactionRequest.network,
        } as const // narrow types for compatiblity with our internal ones

        return signedTx
      } catch (err) {
        logger.error(
          `Error encountered! ledgerID: ${
            this.#currentLedgerId
          } transactionRequest: ${transactionRequest} error: ${err}`,
        )

        throw err
      }
    })
  }

  async signTypedData(
    typedData: EIP712TypedData,
    account: HexString,
    { deviceID, path: derivationPath }: LedgerAccountSigner,
  ): Promise<string> {
    return this.runSerialized(async () => {
      if (!this.transport) {
        throw new Error("Uninitialized transport!")
      }

      if (!this.#currentLedgerId) {
        throw new Error("Uninitialized Ledger ID!")
      }

      const eth = new Eth(this.transport)
      const { EIP712Domain: _, ...typesForSigning } = typedData.types
      const hashedDomain = _TypedDataEncoder.hashDomain(typedData.domain)
      const hashedMessage = _TypedDataEncoder
        .from(typesForSigning)
        .hash(typedData.message)

      const accountData = await this.db.getAccountByAddress(account)

      this.checkCanSign(accountData, derivationPath, deviceID)

      const signature = await eth.signEIP712HashedMessage(
        derivationPath,
        hashedDomain,
        hashedMessage,
      )

      this.emitter.emit(
        "signedData",
        joinSignature({
          r: `0x${signature.r}`,
          s: `0x${signature.s}`,
          v: signature.v,
        }),
      )

      return joinSignature({
        r: `0x${signature.r}`,
        s: `0x${signature.s}`,
        v: signature.v,
      })
    })
  }

  private checkCanSign(
    accountData: LedgerAccount | null,
    path: string,
    deviceID: string,
  ) {
    if (
      !accountData ||
      path !== accountData.path ||
      deviceID !== accountData.ledgerId
    ) {
      throw new Error("Signing method mismatch!")
    }

    if (deviceID !== this.#currentLedgerId) {
      throw new Error("Cannot sign on wrong device attached!")
    }
  }

  async signMessage(
    { address, network }: AddressOnNetwork,
    hexDataToSign: HexString,
  ): Promise<string> {
    // Currently the service assumes the Eth app, which requires a network that
    // uses the same derivation path as Ethereum, or one that starts with the
    // same components.
    // FIXME This should take a `LedgerAccountSigner` and use `checkCanSign`
    // FIXME like other signing methods.
    if (
      network.derivationPath !== ETHEREUM.derivationPath &&
      !network.derivationPath?.startsWith(ETHEREUM.derivationPath ?? "")
    ) {
      throw new Error("Unsupported network for Ledger signing")
    }

    if (!this.transport) {
      throw new Error("Uninitialized transport!")
    }

    if (!this.#currentLedgerId) {
      throw new Error("Uninitialized Ledger ID!")
    }

    const accountData = await this.db.getAccountByAddress(address)

    if (!accountData) {
      throw new Error(
        `Address "${address}" doesn't have corresponding derivation path!`,
      )
    }

    const eth = new Eth(this.transport)

    const signature = await eth.signPersonalMessage(
      accountData.path,
      // Ledger requires unprefixed hex, so make sure that's what we pass.
      hexDataToSign.replace(/^0x/, ""),
    )

    const signatureHex = joinSignature({
      r: `0x${signature.r}`,
      s: `0x${signature.s}`,
      v: signature.v,
    })
    this.emitter.emit("signedData", signatureHex)

    return signatureHex
  }
}
