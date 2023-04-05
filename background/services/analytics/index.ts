import { v4 as uuidv4 } from "uuid"
import browser from "webextension-polyfill"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import { AnalyticsDatabase, getOrCreateDB } from "./db"
import {
  AnalyticsEvent,
  deletePerson,
  getPersonId,
  OneTimeAnalyticsEvent,
  sendPosthogEvent,
} from "../../lib/posthog"
import PreferenceService from "../preferences"
import { FeatureFlags, isEnabled as isFeatureFlagEnabled } from "../../features"
import logger from "../../lib/logger"

interface Events extends ServiceLifecycleEvents {
  enableDefaultOn: void
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
    [Promise<PreferenceService>]
  > = async (preferenceService) => {
    const db = await getOrCreateDB()

    return new this(db, await preferenceService)
  }

  private constructor(
    private db: AnalyticsDatabase,
    private preferenceService: PreferenceService
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    let { isEnabled, hasDefaultOnBeenTurnedOn } =
      await this.preferenceService.getAnalyticsPreferences()

    if (
      isFeatureFlagEnabled(FeatureFlags.ENABLE_ANALYTICS_DEFAULT_ON) &&
      !hasDefaultOnBeenTurnedOn
    ) {
      // this handles the edge case where we have already shipped analytics
      // but with default turned off and now we want to turn default on
      // and show a notification to the user

      isEnabled = true
      hasDefaultOnBeenTurnedOn = true

      await this.preferenceService.updateAnalyticsPreferences({
        isEnabled,
        hasDefaultOnBeenTurnedOn,
      })

      await this.emitter.emit("enableDefaultOn", undefined)
    }

    if (isEnabled) {
      const { uuid, isNew } = await this.getOrCreateAnalyticsUUID()

      browser.runtime.setUninstallURL(
        `${process.env.WEBSITE_ORIGIN}/goodbye?uuid=${uuid}`
      )

      if (isNew) {
        await this.sendAnalyticsEvent(AnalyticsEvent.NEW_INSTALL)
      }
    }
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async sendAnalyticsEvent(
    eventName: AnalyticsEvent,
    payload?: Record<string, unknown>
  ): Promise<void> {
    // @TODO: implement event batching

    const { isEnabled } = await this.preferenceService.getAnalyticsPreferences()
    if (isEnabled) {
      const { uuid } = await this.getOrCreateAnalyticsUUID()

      sendPosthogEvent(uuid, eventName, payload)
    }
  }

  async sendOneTimeAnalyticsEvent(
    eventName: OneTimeAnalyticsEvent,
    payload?: Record<string, unknown>
  ): Promise<void> {
    if (await this.db.oneTimeEventExists(eventName)) {
      // Don't send the event if it has already been sent.
      return
    }

    const { isEnabled } = await this.preferenceService.getAnalyticsPreferences()
    if (isEnabled) {
      const { uuid } = await this.getOrCreateAnalyticsUUID()

      sendPosthogEvent(uuid, eventName, payload)
      this.db.setOneTimeEvent(eventName)
    }
  }

  async removeAnalyticsData(): Promise<void> {
    try {
      const { uuid } = await this.getOrCreateAnalyticsUUID()
      const id = await getPersonId(uuid)
      deletePerson(id)
    } catch (e) {
      logger.error("Deleting Analytics Data Failed ", e)
    }
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
