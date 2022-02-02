import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer"
import KeyringService from "../keyring"
import LedgerService from "../ledger"
import { EIP1559TransactionRequest, SignedEVMTransaction } from "../../networks"
import { HexString } from "../../types"
import BaseService from "../base"
// import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

type Events = ServiceLifecycleEvents

/**
 * The SigningService is responsible for
 *
 * The main purpose for this service/layer is
 *
 * The responsibility of this service is 2 fold.
 * - xxx
 */
export default class SigningService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    SigningService,
    [Promise<KeyringService>, Promise<LedgerService>]
  > = async (keyringService, ledgerService) => {
    return new this(await keyringService, await ledgerService)
  }

  private constructor(
    private keyringService: KeyringService,
    private ledgerService: LedgerService
  ) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns
  }

  async deriveAddress(signerID: string): Promise<HexString> {
    if (signerID.startsWith("ledger-")) {
      return this.ledgerService.deriveAddress(
        signerID.substring("ledger-".length)
      )
    }

    if (signerID.startsWith("keyring-")) {
      return this.keyringService.deriveAddress(
        signerID.substring("keyring-".length)
      )
    }

    throw new Error(`Unknown signerID: ${signerID}`)
  }

  async signTransaction(
    address: HexString,
    transactionRequest: EIP1559TransactionRequest
  ): Promise<SignedEVMTransaction> {
    this.signTransaction = this.signTransaction.bind(this)

    throw new Error("Unimplemented")
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
