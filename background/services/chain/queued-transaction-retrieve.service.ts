import {
  ServiceCreatorFunctionWithDatabase,
  ServiceLifecycleEvents,
} from "../types"

import BaseService from "../base"
import { ChainDatabase } from "./db"

interface Events extends ServiceLifecycleEvents {
  placeHolderEventForTypingPurposes: string
}

/*
 * The analytics service is responsible for listening to events in the service layer,
 * handling sending and persistance concerns.
 */
export default class QueuedTransactionRetrieveService extends BaseService<Events> {
  /*
   * Create a new QueuedTransactionRetrieveService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunctionWithDatabase<
    Events,
    QueuedTransactionRetrieveService,
    [],
    ChainDatabase
  > = async (db: ChainDatabase) => {
    return new this(db)
  }

  private constructor(private db: ChainDatabase) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }
}
