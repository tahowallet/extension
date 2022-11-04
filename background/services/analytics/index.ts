import { v4 as uuidv4 } from "uuid"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import { AnalyticsDatabase, getOrCreateDB } from "./db"
import { sendPosthogEvent } from "../../lib/posthog"
import ChainService from "../chain"
import PreferenceService from "../preferences"

interface Events extends ServiceLifecycleEvents {
  placeHolderEventForTypingPurposes: string
}

/*
 * The analytics service is responsible for listening to events in the service layer,
 * handling sending and persistance concerns.
 */
export default class AnalyticsService extends BaseService<Events> {
  /*
   * Create a new AnalyticsService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<
    Events,
    AnalyticsService,
    [Promise<ChainService>, Promise<PreferenceService>]
  > = async (chainService, preferenceService) => {
    const db = await getOrCreateDB()

    return new this(db, await chainService, await preferenceService)
  }

  private constructor(
    private db: AnalyticsDatabase,
    private chainService: ChainService,
    private preferenceService: PreferenceService
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.connectEventListeners()
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async sendAnalyticsEvent(
    eventName: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    // @TODO: implement event batching

    const { isEnabled } = await this.preferenceService.getAnalyticsSettings()
    if (isEnabled) {
      const { uuid, isNew } = await this.getOrCreateAnalyticsUUID()
      if (isNew) {
        sendPosthogEvent(uuid, "New install", payload)
      }

      sendPosthogEvent(uuid, eventName, payload)
    }
  }

  private connectEventListeners() {
    // ⚠️ Note: We NEVER send addresses to analytics!
    this.chainService.emitter.on("newAccountToTrack", () => {
      this.sendAnalyticsEvent("Address added to tracking on network", {
        description: `
            This event is fired when any address on a network is added to the tracked list. 
            
            Note: this does not track recovery phrase(ish) import! But when an address is used 
            on a network for the first time (read-only or recovery phrase/ledger/keyring).
            `,
      })
    })
  }

  private async getOrCreateAnalyticsUUID(): Promise<{
    uuid: string
    isNew: boolean
  }> {
    const uuid = await this.db.getAnalyticsUUID()

    if (uuid === undefined) {
      const newUUID = uuidv4()
      await this.db.setAnalyticsUUID(newUUID)

      return { uuid: newUUID, isNew: true }
    }

    return { uuid, isNew: false }
  }
}
