import Emittery from "emittery"
import browser, { Alarms } from "webextension-polyfill"
import type { Service, ServiceLifecycleEvents } from "./types"

/**
 * An alarm schedule for use in the `browser.alarms` API.
 *
 * Note that even if `periodInMinutes` is less than 1, the alarm will only fire
 * a maximum of once a minute in Chrome for a packaged extension. When an
 * extension is loaded unpacked (from a directory for development), periods
 * less than 1 minute are respected across browsers.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/alarms/create|
 * The MDN docs for `alarms.create`}.
 */
type AlarmSchedule =
  | {
      when: number
      periodInMinutes?: number
    }
  | {
      delayInMinutes: number
      periodInMinutes?: number
    }
  | { periodInMinutes: number }

/**
 * An object carrying the same information as {@link AlarmSchedule}, but that
 * also provides a handler to handle the specified alarm. Designed for use with
 * {@link AlarmHandlerScheduleMap}, which allows for disambiguating between
 * different alarms.
 *
 * Also provides an optional `runAtStart` property that will immediately fire
 * the handler at service start for the first time instead of waiting for the
 * first scheduled run to execute.
 */
export type AlarmHandlerSchedule = {
  schedule: AlarmSchedule
  handler: (alarm?: Alarms.Alarm) => void
  runAtStart?: boolean
}

/**
 * An object mapping alarm names to their designated schedules. Alarm names are
 * used to disambiguate between different alarms when they are fired, so as to
 * fire the handler associated with the appropriate alarm.
 */
export type AlarmHandlerScheduleMap = {
  [alarmName: string]: AlarmHandlerSchedule
}

/**
 * `BaseService` provides a base class for {@link Service|services} that adhere
 * to a standard service lifecycle.
 *
 * @remarks
 *
 * The base service provides a handful of pre-handled details for these
 * services:
 *
 *  - A preconfigured `emitter` object for emitting events.
 *  - Built-in support for defining alarms and their handlers by name (more
 *    below).
 *  - A consistent, coherent implementation of `startService` and `stopService`.
 *    This includes only starting a service once, only stopping a service once,
 *    throwing if a caller attempts to restart a stopped service, and throwing if
 *    a caller attempts to stop an unstarted service.
 *  - Extension points for service start/stop processes at
 *    `internalStartService` and `internalStopService` (more below).
 *
 * ### Event types
 *
 * The type parameter to `BaseService` allows for the inclusion of a more
 * specific set of events relevant to the particular service. All services are
 * expected to emit service lifecycle events, and these are handled directly by
 * the `BaseService` class.
 *
 * ### Alarm scheduling
 *
 * The constructor for `BaseService` takes a set of {@link AlarmHandlerSchedule},
 * indexed by name in an object. When `startService` is called, those alarms
 * are added to the browser alarm list, and the `handleAlarm` method is bound
 * as a listener. It automatically invokes the associated handlers.
 *
 * ### Extending the start and stop processes
 *
 * The `startService` and `stopService` methods are not meant to be overridden
 * as they handle internal started/stopped state details. Instead,
 * `internalStartService` and `internalStopService` are both provided for
 * customization of the start and stop processes.
 *
 * By default, these two set up and tear down browser alarms, so subclasses
 * should generally call `BaseService`'s implementation.
 */
export default abstract class BaseService<
  Events extends ServiceLifecycleEvents,
> implements Service<Events> {
  /**
   * {@inheritdoc Service.emitter}
   */
  readonly emitter = new Emittery<Events>()

  // Used for listener adding/removing, where we need an identical reference.
  private boundAlarmHandler = this.handleAlarm.bind(this)

  /**
   * Takes the set of alarm schedules that this service wants to run. Schedules
   * are not added until `startService` is called.
   */
  protected constructor(
    protected readonly alarmSchedules: AlarmHandlerScheduleMap = {},
  ) {}

  /**
   * Hook for subclass starting tasks. Subclasses should call
   * `await super.internalStartService()`, as the base implementation sets up
   * all alarms and their handling.
   */
  protected async internalStartService(): Promise<void> {
    const scheduleEntries = Object.entries(this.alarmSchedules)

    scheduleEntries.forEach(([name, { schedule, runAtStart, handler }]) => {
      browser.alarms.create(name, schedule)

      if (runAtStart) {
        handler()
      }
    })

    if (scheduleEntries.length > 0) {
      browser.alarms.onAlarm.addListener(this.boundAlarmHandler)
    }
  }

  /**
   * Hook for subclass stopping tasks. Subclasses should call
   * `await super.internalStopService()`, as the base implementation cleans up
   * all alarms and their handling.
   */
  protected async internalStopService(): Promise<void> {
    const scheduleNames = Object.keys(this.alarmSchedules)

    scheduleNames.forEach((alarmName) => browser.alarms.clear(alarmName))

    if (scheduleNames.length > 0) {
      browser.alarms.onAlarm.removeListener(this.boundAlarmHandler)
    }
  }

  /**
   * Default handler for alarms. By default, calls the defined handler for the
   * named alarm, if available. Override for custom behavior.
   */
  protected handleAlarm(alarm: Alarms.Alarm): void {
    this.alarmSchedules[alarm.name]?.handler(alarm)
  }

  private serviceState: "unstarted" | "starting" | "started" | "stopped" =
    "unstarted"

  /**
   * {@inheritdoc Service.started}
   *
   * @throws {Error} If the service has already been stopped.
   */
  async started(): Promise<this> {
    switch (this.serviceState) {
      case "started":
        return this

      case "stopped":
        throw new Error("Service is already stopped and cannot be restarted.")

      case "unstarted":
      case "starting":
        return this.emitter.once("serviceStarted").then(() => this)

      default: {
        const exhaustiveCheck: never = this.serviceState
        throw new Error(`Unreachable code: ${exhaustiveCheck}`)
      }
    }
  }

  // Below, readonly properties as a poor man's `final`/`sealed` so subclasses
  // don't override this and break lifecycle management. `internalStartService`
  // and `internalStopService` are the hooks for subclasses. Pulled from
  // https://github.com/microsoft/TypeScript/issues/8306#issuecomment-737568178.
  // Note that this means each subclass instance has a copy of the function;
  // this is mostly a memory usage concern, and since services are effectively
  // singletons at the moment and the number of services is limited, the
  // concern should be minimal.

  /**
   * {@inheritdoc Service.startService}
   *
   * Subclasses should extend `internalStartService` to handle additional
   * starting tasks.
   *
   * @throws {Error} If the service has already been stopped.
   *
   * @sealed
   */
  readonly startService = async (): Promise<void> => {
    switch (this.serviceState) {
      case "started":
      case "starting":
        return

      case "stopped":
        throw new Error("Service is already stopped and cannot be restarted.")

      case "unstarted":
        this.serviceState = "starting"
        await this.internalStartService()
        this.serviceState = "started"
        this.emitter.emit("serviceStarted", undefined)
        break

      default: {
        const exhaustiveCheck: never = this.serviceState
        throw new Error(`Unreachable code: ${exhaustiveCheck}`)
      }
    }
  }

  /**
   * {@inheritdoc Service.stopService}
   *
   * Subclasses should extend `internalStopService` to handle additional
   * stopping tasks.
   *
   * @throws {Error} If the service has never been started.
   *
   * @sealed
   */
  readonly stopService = async (): Promise<void> => {
    switch (this.serviceState) {
      case "unstarted":
        throw new Error("Attempted to stop a service that was never started.")

      case "stopped":
        return

      case "starting":
        await this.started()
        await this.stopService()
        break

      case "started":
        await this.internalStopService()
        this.serviceState = "stopped"
        this.emitter.emit("serviceStopped", undefined)
        break

      default: {
        const exhaustiveCheck: never = this.serviceState
        throw new Error(`Unreachable code: ${exhaustiveCheck}`)
      }
    }
  }
}
