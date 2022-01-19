import { SignedEVMTransaction } from "../../networks"
import { HexString } from "../../types"
import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import logger from "../../lib/logger"

enum LedgerType {
  LEDGER_NANO_S,
  LEDGER_NANO_X,
}

type MetaData = {
  deviceVersion: string
  ethereumDAppVersion: string
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

/**
 * The LedgerService is responsible for
 *
 * The main purpose for this service/layer is
 *
 * The responsibility of this service is 2 fold.
 * - xxx
 */
export default class LedgerService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    LedgerService,
    [] // we don't know our final dependencies
  > = async () => {
    return new this()
  }

  private constructor() {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    // this.emitter.emit(
    //   "initializeAllowedPages",
    //   await this.db.getAllPermission()
    // )
  }
}
