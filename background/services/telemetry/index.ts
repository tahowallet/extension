import { RootState } from "../../redux-slices"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import logger from "../../lib/logger"
import { encodeJSON } from "../../lib/utils"

/**
 * The TelemetryService is responsible for tracking usage statistics in Taho.
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
  > = async () => new this()

  private constructor() {
    super({
      storageUsage: {
        schedule: {
          periodInMinutes: 60,
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
    const storageUsage = await navigator.storage.estimate()
    const output = [
      "Extension storage quota:",
      TelemetryService.formatBytes(storageUsage.quota),
      "\nIndexedDB usage:",
      TelemetryService.formatBytes(storageUsage.usage),
    ]

    if (this.store) {
      const state = this.store.getState()
      output.push(
        "\nRedux state:",
        TelemetryService.formatBytes(encodeJSON(state).length),
      )
    }

    logger.debug(...output)
  }

  private static formatBytes(bytes: number | undefined) {
    const magnitude = ["Bytes", "KB", "MB", "GB", "TB"]

    if (bytes) {
      const order = Math.floor(Math.log(bytes) / Math.log(1024))
      return `${Math.round(bytes / 1024 ** order)} ${magnitude[order]}`
    }

    return "0 Bytes"
  }
}
