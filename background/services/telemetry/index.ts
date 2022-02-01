import { ReduxStoreType } from "../.."
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import logger from "../../lib/logger"

/**
 * The TelemetryService is responsible for tracking usage statistics in Tally.
 *
 * Currently we are only tracking extension storage information and logging
 * it to the console.
 */
export default class TelemetryService extends BaseService<ServiceLifecycleEvents> {
  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    TelemetryService,
    []
  > = async () => {
    return new this()
  }

  private constructor() {
    super({
      storageUsage: {
        schedule: {
          periodInMinutes: 0.1,
        },
        handler: () => TelemetryService.checkStorageUsage(),
        runAtStart: true,
      },
    })
  }

  static connectReduxStore(store: ReduxStoreType): void {
    const state = store.getState()
    logger.log("Redux state: ", state)
  }

  static async checkStorageUsage(): Promise<void> {
    logger.log(`Extension storage usage: `, await navigator.storage.estimate())
  }
}
