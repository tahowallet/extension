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
import { snapshotAndReset } from "../../lib/perf-metrics"
import {
  onEventLoopStall,
  Stall,
  STALL_THRESHOLD_MS,
  topActivities,
} from "../../lib/stall-watch"
import { MINUTE } from "../../constants"

// Perf metrics are aggregated in memory and flushed at a cadence long enough
// that a typical wallet session contributes at most a handful of events,
// but short enough to produce multiple samples per day for active users.
const PERF_METRICS_FLUSH_INTERVAL_MINUTES = 180

/**
 * How long a background stall reporting window lasts. The first stall opens a
 * window, and every stall in it is reported together when it closes, so an
 * install that stalls often sends one event every ten minutes rather than one
 * per stall.
 */
export const STALL_REPORT_INTERVAL_MS = 10 * MINUTE

/** How many of the most frequent activities a stall report names. */
const STALL_REPORT_TOP_ACTIVITIES = 5

/** The stalls seen in one reporting window. */
type StallWindow = {
  count: number
  longestMs: number
  totalMs: number
  since: number
  /** How many stalls fell in each duration range. */
  durations: { under250Ms: number; under1000Ms: number; over1000Ms: number }
  /** How many stalls had no tracked work running. */
  untracked: number
  /** How many stalls each tracked activity overlapped. */
  during: Map<string, number>
}

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
    super({
      flushPerfMetrics: {
        schedule: { periodInMinutes: PERF_METRICS_FLUSH_INTERVAL_MINUTES },
        handler: () => this.flushPerfMetrics(),
      },
    })

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

  /** Stalls seen in the current reporting window, if any. */
  #stalls: StallWindow | undefined

  #stallReportTimer: ReturnType<typeof setTimeout> | undefined

  #stopWatchingStalls: (() => void) | undefined

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()
    this.#stopWatchingStalls = onEventLoopStall((stall) =>
      this.recordStall(stall),
    )
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
    this.#stopWatchingStalls?.()
    clearTimeout(this.#stallReportTimer)
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

  /**
   * Drains the in-memory perf metrics collector and, if the snapshot contains
   * any observations and analytics are enabled, emits it as a single event.
   *
   * Kept best-effort: failing to flush should never interfere with the rest
   * of the service, since the next interval will pick up a fresh window.
   */
  private async flushPerfMetrics(): Promise<void> {
    try {
      const snapshot = snapshotAndReset()
      const hasChains = Object.keys(snapshot.chains).length > 0
      if (!hasChains && !snapshot.redux) {
        return
      }

      await this.sendAnalyticsEvent(AnalyticsEvent.PERF_METRICS_FLUSH, {
        windowStartedAt: snapshot.windowStartedAt,
        takenAt: snapshot.takenAt,
        windowDurationMs: snapshot.takenAt - snapshot.windowStartedAt,
        chains: snapshot.chains,
        ...(snapshot.redux ? { redux: snapshot.redux } : {}),
      })
    } catch (error) {
      logger.debug("Perf metrics flush failed: ", error)
    }
  }

  /**
   * Records a background stall in the current reporting window. The first
   * stall opens a window, and once {@link STALL_REPORT_INTERVAL_MS} has
   * passed, every stall in it is reported together in a single event.
   */
  private recordStall({ durationMs, during }: Stall, now = Date.now()): void {
    let stalls = this.#stalls
    if (stalls === undefined) {
      stalls = {
        count: 0,
        longestMs: 0,
        totalMs: 0,
        since: now,
        durations: { under250Ms: 0, under1000Ms: 0, over1000Ms: 0 },
        untracked: 0,
        during: new Map(),
      }
      this.#stalls = stalls
      this.#stallReportTimer = setTimeout(
        () => this.reportStalls(),
        STALL_REPORT_INTERVAL_MS,
      )
    }
    stalls.count += 1
    stalls.longestMs = Math.max(stalls.longestMs, durationMs)
    stalls.totalMs += durationMs
    if (durationMs < 250) stalls.durations.under250Ms += 1
    else if (durationMs < 1_000) stalls.durations.under1000Ms += 1
    else stalls.durations.over1000Ms += 1
    if (during.length === 0) stalls.untracked += 1
    during.forEach((label) =>
      stalls.during.set(label, (stalls.during.get(label) ?? 0) + 1),
    )
  }

  /**
   * Sends a {@link AnalyticsEvent.BACKGROUND_STALLED} event summarizing the
   * stalls in the current reporting window, if there were any, and closes the
   * window.
   */
  private reportStalls(now = Date.now()): void {
    clearTimeout(this.#stallReportTimer)
    this.#stallReportTimer = undefined
    const stalls = this.#stalls
    if (stalls === undefined) return
    this.#stalls = undefined

    this.sendAnalyticsEvent(AnalyticsEvent.BACKGROUND_STALLED, {
      stalls: stalls.count,
      longestMs: Math.round(stalls.longestMs),
      totalMs: Math.round(stalls.totalMs),
      durations: stalls.durations,
      // Stalls during which no tracked work was running.
      untracked: stalls.untracked,
      // The tracked work, such as thunks, alarms and slow actions, that was
      // running during the most stalls, as "label ×count".
      during: topActivities(stalls.during, STALL_REPORT_TOP_ACTIVITIES),
      thresholdMs: STALL_THRESHOLD_MS,
      windowStartedAt: stalls.since,
      windowDurationMs: now - stalls.since,
    }).catch((error) => {
      logger.debug("Reporting background stalls failed: ", error)
    })
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
