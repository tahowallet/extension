import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer"
import KeyringService from "../keyring"
import LedgerService from "../ledger"
import { EIP1559TransactionRequest, SignedEVMTransaction } from "../../networks"
import { HexString } from "../../types"
import BaseService from "../base"
// import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import ChainService from "../chain"
import logger from "../../lib/logger"
import { SigningMethod } from "../../redux-slices/signing"

type Events = ServiceLifecycleEvents

type SignerType = "keyring" | HardwareSignerType
type HardwareSignerType = "ledger"

type AddressHandler = {
  address: string
  signer: SignerType
}

type AccountSigner = {
  type: SignerType
  accountID: string
}

/**
 * The SigningService is responsible for
 *
 * The main purpose for this service/layer is
 *
 * The responsibility of this service is 2 fold.
 * - xxx
 */
export default class SigningService extends BaseService<Events> {
  addressHandlers: AddressHandler[] = []

  static create: ServiceCreatorFunction<
    Events,
    SigningService,
    [Promise<KeyringService>, Promise<LedgerService>, Promise<ChainService>]
  > = async (keyringService, ledgerService, chainService) => {
    return new this(
      await keyringService,
      await ledgerService,
      await chainService
    )
  }

  private constructor(
    private keyringService: KeyringService,
    private ledgerService: LedgerService,
    private chainService: ChainService
  ) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns
  }

  async deriveAddress(signerID: AccountSigner): Promise<HexString> {
    if (signerID.type === "ledger") {
      return this.ledgerService.deriveAddress(signerID.accountID)
    }

    if (signerID.type === "keyring") {
      return this.keyringService.deriveAddress(signerID.accountID)
    }

    throw new Error(`Unknown signerID: ${signerID}`)
  }

  private async signTransactionWithNonce(
    transactionWithNonce: EIP1559TransactionRequest & { nonce: number },
    signingMethod: SigningMethod
  ): Promise<SignedEVMTransaction> {
    switch (signingMethod.type) {
      case "ledger":
        return this.ledgerService.signTransaction(
          transactionWithNonce,
          signingMethod.deviceID,
          signingMethod.path
        )
      case "keyring":
        return this.keyringService.signTransaction(
          transactionWithNonce.from,
          transactionWithNonce
        )
      default:
        throw new Error(`Unreachable!`)
    }
  }

  async signTransaction(
    transactionRequest: EIP1559TransactionRequest,
    signingMethod: SigningMethod
  ): Promise<SignedEVMTransaction> {
    const transactionWithNonce =
      await this.chainService.populateEVMTransactionNonce(transactionRequest)

    try {
      return await this.signTransactionWithNonce(
        transactionWithNonce,
        signingMethod
      )
    } finally {
      this.chainService.releaseEVMTransactionNonce(transactionWithNonce)
    }
  }

  addTrackedAddress(address: string, handler: SignerType): void {
    this.addressHandlers.push({ address, signer: handler })
  }

  async signTypedData(
    address: string,
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>
  ): Promise<string> {
    this.signTypedData = this.signTypedData.bind(this)

    throw new Error("Unimplemented")
  }

  async signMessage(address: string, message: string): Promise<string> {
    this.signMessage = this.signMessage.bind(this)

    throw new Error("Unimplemented")
  }
}
