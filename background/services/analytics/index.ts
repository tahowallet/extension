import { v4 as uuidv4 } from "uuid"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

import BaseService from "../base"
import { AnalyticsDatabase, getOrCreateDB } from "./db"
import { sendPosthogEvent } from "../../lib/posthog"

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
    sendPosthogEvent(await this.getOrCreateAnalyticsUUID(), eventName, payload)
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
