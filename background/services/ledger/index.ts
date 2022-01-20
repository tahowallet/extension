import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer"
import { EIP1559TransactionRequest, SignedEVMTransaction } from "../../networks"
import { HexString } from "../../types"
import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import logger from "../../lib/logger"

enum LedgerType {
  UNKNOWN,
  LEDGER_NANO_S,
  LEDGER_NANO_X,
}

type MetaData = {
  ethereumVersion: string
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
  connected: { id: string; type: LedgerType }
  disconnected: { id: string; type: LedgerType }
  address: { ledgerID: string; derivationPath: string; address: HexString }
  signedTransaction: SignedEVMTransaction
}

async function requireAvailableLedger() {
  const devs = await navigator.usb.getDevices()

  if (devs.length === 0) {
    throw new Error("No available USB devices to use!")
  }
}

/**
 * The LedgerService is responsible for
 *
 * The main purpose for this service/layer is
 *
 * The responsibility of this service is 2 fold.
 * - xxx
 */
export default class LedgerService extends BaseService<Events> {
  static create: ServiceCreatorFunction<Events, LedgerService, []> =
    async () => {
      logger.info("LedgerService::create")
      return new this()
    }

  private constructor() {
    super()
    logger.info("LedgerService::constructor")
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    logger.info("LedgerService::internalStartService")
  }

  async deriveAddress(accountID: string): Promise<HexString> {
    requireAvailableLedger()

    this.deriveAddress = this.deriveAddress.bind(this)

    throw new Error("Unimplemented")
  }

  async signTransaction(
    address: HexString,
    transactionRequest: EIP1559TransactionRequest
  ): Promise<SignedEVMTransaction> {
    requireAvailableLedger()

    this.signTransaction = this.signTransaction.bind(this)

    throw new Error("Unimplemented")
  }

  async signTypedData(
    address: string,
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>
  ): Promise<string> {
    requireAvailableLedger()

    this.signTypedData = this.signTypedData.bind(this)

    throw new Error("Unimplemented")
  }

  async signMessage(address: string, message: string): Promise<string> {
    requireAvailableLedger()

    this.signMessage = this.signMessage.bind(this)

    throw new Error("Unimplemented")
  }
}
