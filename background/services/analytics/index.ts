import { v4 as uuidv4 } from "uuid"
import browser from "webextension-polyfill"

import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

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
import logger from "../../lib/logger"
import SigningService, {
  SignatureResponse,
  TXSignatureResponse,
} from "../signing"
import InternalSignerService from "../internal-signer"
import { assertUnreachable } from "../../lib/utils/type-guards"

const chainSpecificOneTimeEvents = [OneTimeAnalyticsEvent.CHAIN_ADDED]
interface Events extends ServiceLifecycleEvents {
  enableDefaultOn: void
}

/*
 * The analytics service is responsible for listening to events in the service layer,
 * handling sending and persistence concerns.
 */
export default class AnalyticsService extends BaseService<Events> {
  #analyticsUUID: string | undefined = undefined

  /*
   * Create a new AnalyticsService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<
    Events,
    AnalyticsService,
    [
      Promise<InternalSignerService>,
      Promise<SigningService>,
      Promise<PreferenceService>,
    ]
  > = async (internalSignerService, signingService, preferenceService) => {
    const db = await getOrCreateDB()

    return new this(
      db,
      await internalSignerService,
      await signingService,
      await preferenceService,
    )
  }

  private constructor(
    private db: AnalyticsDatabase,
    private internalSignerService: InternalSignerService,
    private signingService: SigningService,
    private preferenceService: PreferenceService,
  ) {
    super()

    this.internalSignerService.emitter.on(
      "vaultMigrationCompleted",
      (result) => {
        if ("newVaultVersion" in result) {
          this.sendAnalyticsEvent(AnalyticsEvent.VAULT_MIGRATION, {
            version: result.newVaultVersion,
          })
        } else {
          this.sendAnalyticsEvent(AnalyticsEvent.VAULT_MIGRATION_FAILED, {
            error: result.errorMessage,
          })
        }
      },
    )

    this.signingService.emitter.on(
      "signingTxResponse",
      this.trackSigningEvent.bind(this),
    )
    this.signingService.emitter.on(
      "signingDataResponse",
      this.trackSigningEvent.bind(this),
    )
    this.signingService.emitter.on(
      "personalSigningResponse",
      this.trackSigningEvent.bind(this),
    )
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
    const { uuid, isNew } = await this.getOrCreateAnalyticsUUID()

    let { isEnabled, hasDefaultOnBeenTurnedOn } =
      await this.preferenceService.getAnalyticsPreferences()

    if (!hasDefaultOnBeenTurnedOn) {
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
      browser.runtime.setUninstallURL(
        process.env.NODE_ENV === "development"
          ? "about:blank"
          : `${process.env.WEBSITE_ORIGIN}/goodbye?uuid=${uuid}`,
      )

      if (isNew) {
        await this.sendAnalyticsEvent(AnalyticsEvent.NEW_INSTALL)
      }
    }

    this.#analyticsUUID = uuid
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  get analyticsUUID() {
    if (!this.#analyticsUUID) {
      throw new Error(
        "Attempted to access analytics UUID before service started",
      )
    }
    return this.#analyticsUUID
  }

  async sendAnalyticsEvent(
    eventName: AnalyticsEvent,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    // @TODO: implement event batching

    const { isEnabled } = await this.preferenceService.getAnalyticsPreferences()
    // We want to send the ANALYTICS_TOGGLED event to denote that the user
    // has disabled analytics - and we send the event after disabling, so
    // we have a special exception here to allow the event to send even
    // after analytics have been set to disabled in the preferenceService.
    if (eventName === AnalyticsEvent.ANALYTICS_TOGGLED || isEnabled) {
      const { uuid } = await this.getOrCreateAnalyticsUUID()

      sendPosthogEvent(uuid, eventName, payload)
    }
  }

  async sendOneTimeAnalyticsEvent(
    eventName: OneTimeAnalyticsEvent,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const { isEnabled } = await this.preferenceService.getAnalyticsPreferences()
    if (!isEnabled) {
      return
    }

    // There are some events that we want to send once per chainId.
    // Rather than creating a separate event for every chain - lets
    // keep the event name uniform (while sending the chainId as a payload)
    // and use the key to track if we've already sent the event for that chainId.
    const chainId = payload?.chainId

    const key = chainSpecificOneTimeEvents.includes(eventName)
      ? `${eventName}-${chainId}`
      : eventName

    if (await this.db.oneTimeEventExists(key)) {
      // Don't send the event if it has already been sent.
      return
    }

    const { uuid } = await this.getOrCreateAnalyticsUUID()

    sendPosthogEvent(uuid, eventName, payload)
    this.db.setOneTimeEvent(key)
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

  private async trackSigningEvent(
    event: TXSignatureResponse | SignatureResponse,
  ): Promise<void> {
    switch (event.type) {
      case "success-tx":
        return this.sendAnalyticsEvent(AnalyticsEvent.TRANSACTION_SIGNED, {
          chainId: event.signedTx.network.chainID,
        })
      case "success-data":
        return this.sendAnalyticsEvent(AnalyticsEvent.DATA_SIGNED)
      case "error":
        return this.sendAnalyticsEvent(AnalyticsEvent.SIGNATURE_FAILED, {
          reason: event.reason,
        })
      default:
        return assertUnreachable(event)
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
