import { v4 as uuidv4 } from "uuid"
import { logger } from "ethers"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import { AnalyticsDatabase, getOrCreateDB } from "./db"
import { FeatureFlags, isEnabled } from "../../features"

// env variables are simple strings, so destructuring doesn't make much sense in this context
// eslint-disable-next-line prefer-destructuring
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY

// env variables are simple strings, so destructuring doesn't make much sense in this context
// eslint-disable-next-line prefer-destructuring
const USE_ANALYTICS_CONTEXT = process.env.USE_ANALYTICS_CONTEXT

// env variables are simple strings, so destructuring doesn't make much sense in this context
// eslint-disable-next-line prefer-destructuring
const POSTHOG_URL = process.env.POSTHOG_URL

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
  static create: ServiceCreatorFunction<Events, AnalyticsService, []> =
    async () => {
      const db = await getOrCreateDB()

      return new this(db)
    }

  private constructor(private db: AnalyticsDatabase) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async sendAnalyticsEvent(
    eventName: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    if (
      !isEnabled(FeatureFlags.SUPPORT_ANALYTICS) ||
      !POSTHOG_URL ||
      !POSTHOG_API_KEY
    ) {
      // We don't want to send analytics events if any of the above is false
      return
    }

    try {
      // fetchJson works only with GET requests
      fetch(POSTHOG_URL, {
        method: "POST",
        body: JSON.stringify({
          api_key: POSTHOG_API_KEY,
          event: eventName,
          // Let's include a timestamp just to be sure.
          timestamp: new Date().toISOString(),
          properties: {
            // UUIDv4 type unique userID
            distinct_id: await this.getOrCreateAnalyticsUUID(),
            // Let's store the URL so we can differentiate between the sources later on.
            url: window.location.origin,
            // We want to separate events based on which context they originate from
            // The intended context at the moment of writing: DEV, BETA, PROD
            // We gain nothing from restricting to these, so we skip the verification
            context: USE_ANALYTICS_CONTEXT,
            // Let's also send in anything that we might send with the event. Eg time
            ...payload,
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
    } catch (e) {
      logger.debug("Sending analytics event failed with error: ", e)
    }
  }

  private async getOrCreateAnalyticsUUID(): Promise<string> {
    const uuid = await this.db.getAnalyticsUUID()

    if (uuid === undefined) {
      const newUUID = uuidv4()
      await this.db.setAnalyticsUUID(newUUID)

      return newUUID
    }

    return uuid
  }
}
