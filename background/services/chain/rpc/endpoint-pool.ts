import { Actor, createActor, SimulatedClock } from "xstate"
import { MINUTE, SECOND } from "../../../constants"
import logger from "../../../lib/logger"
import type Endpoint from "./endpoint"
import {
  endpointPoolMachine,
  recoveryIntervalMs,
} from "./endpoint-pool-machine"

/**
 * How long a pool off its primary waits before checking on it again, by how
 * many times in a row it has left it, the last repeating.
 */
export const PRIMARY_RECOVERY_INTERVALS_MS = [
  10 * SECOND,
  30 * SECOND,
  2 * MINUTE,
  10 * MINUTE,
] as const

/** The first of {@link PRIMARY_RECOVERY_INTERVALS_MS}. */
export const PRIMARY_RECOVERY_INTERVAL_MS = PRIMARY_RECOVERY_INTERVALS_MS[0]

/** How long a pool stays on its primary before its failovers are forgotten. */
export const PRIMARY_STABLE_PERIOD_MS = 5 * MINUTE

const describeWait = (ms: number) =>
  ms % MINUTE === 0 ? `${ms / MINUTE} min` : `${Math.round(ms / SECOND)} s`

export type PreferredEndpointListener = (endpoint: Endpoint) => void

/**
 * An ordered set of endpoints that requests walk, starting from the preferred
 * one. Endpoints may belong to more than one pool; their health is shared,
 * but each pool keeps its own preference.
 */
export default class EndpointPool {
  readonly #actor: Actor<typeof endpointPoolMachine>

  readonly #unsubscribers: (() => void)[]

  readonly #listeners = new Set<PreferredEndpointListener>()

  #stopFollowingSignal: () => void = () => {}

  constructor(
    readonly name: string,
    readonly endpoints: readonly Endpoint[],
    {
      recoveryIntervalsMs = PRIMARY_RECOVERY_INTERVALS_MS,
      stablePeriodMs = PRIMARY_STABLE_PERIOD_MS,
      clock,
      signal,
    }: {
      recoveryIntervalsMs?: readonly number[]
      stablePeriodMs?: number
      clock?: SimulatedClock
      /** Disposes the pool when aborted. */
      signal?: AbortSignal
    } = {},
  ) {
    this.#actor = createActor(endpointPoolMachine, {
      input: { size: endpoints.length, recoveryIntervalsMs, stablePeriodMs },
      ...(clock === undefined ? {} : { clock }),
    })
    this.#actor.on("preferredEndpointChanged", ({ index }) => {
      const endpoint = this.endpoints[index]
      const wait = recoveryIntervalMs(this.#actor.getSnapshot().context)
      // Leaving the primary is news; returning to it is routine.
      if (index === 0) {
        logger.debug(
          `The ${name} pool is back on its primary, ${endpoint.label}.`,
        )
      } else {
        logger.info(
          `The ${name} pool now prefers ${endpoint.label}, and checks on its primary again in ${describeWait(wait)}.`,
        )
      }
      this.#listeners.forEach((listener) => listener(endpoint))
    })
    this.#actor.start()

    this.#unsubscribers = endpoints.map((endpoint, index) =>
      endpoint.onStatusChange(() =>
        this.#actor.send({
          type: endpoint.isAvailable
            ? "ENDPOINT_READY"
            : "ENDPOINT_UNAVAILABLE",
          index,
        }),
      ),
    )
    endpoints.forEach((endpoint, index) => {
      if (!endpoint.isAvailable) {
        this.#actor.send({ type: "ENDPOINT_UNAVAILABLE", index })
      }
    })

    if (signal !== undefined) {
      const abort = () => this.dispose()
      signal.addEventListener("abort", abort, { once: true })
      this.#stopFollowingSignal = () =>
        signal.removeEventListener("abort", abort)
    }
  }

  get preferredIndex(): number {
    return this.#actor.getSnapshot().context.preferredIndex
  }

  get preferredEndpoint(): Endpoint {
    return this.endpoints[this.preferredIndex]
  }

  /**
   * The endpoints a request should try, starting from the preferred one and
   * wrapping around, without those that can't take requests right now.
   */
  endpointsInTryOrder(): Endpoint[] {
    const start = this.preferredIndex
    return this.endpoints
      .map(
        (_, offset) => this.endpoints[(start + offset) % this.endpoints.length],
      )
      .filter((endpoint) => endpoint.isAvailable)
  }

  recordSuccess(endpoint: Endpoint): void {
    endpoint.recordSuccess()
    const index = this.endpoints.indexOf(endpoint)
    if (index >= 0) {
      this.#actor.send({ type: "REQUEST_SUCCEEDED", index })
    }
  }

  recordFailure(endpoint: Endpoint): void {
    endpoint.recordFailure()
  }

  onPreferredEndpointChanged(listener: PreferredEndpointListener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  /** Stops following the endpoints, which are disposed by their owner. */
  dispose(): void {
    if (this.#actor.getSnapshot().status === "stopped") {
      return
    }
    this.#stopFollowingSignal()
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.#listeners.clear()
    this.#actor.stop()
  }
}
