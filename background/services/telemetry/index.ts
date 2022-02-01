import { RootState } from "../../redux-slices"
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
  /**
   * We have to keep a reference to the redux store so we can periodically check the size of the state
   */
  private store: { getState(): RootState } | false = false

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
        handler: () => this.checkStorageUsage(),
        runAtStart: true,
      },
    })
  }

  connectReduxStore(store: { getState(): RootState }): void {
    this.store = store
  }

  async checkStorageUsage(): Promise<void> {
    logger.log(`Extension storage usage: `, await navigator.storage.estimate())

    if (this.store) {
      const state = this.store.getState()
      logger.log("Redux state: ", state)
    }
  }
}
