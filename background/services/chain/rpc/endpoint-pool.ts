import { Actor, createActor, SimulatedClock } from "xstate"
import { SECOND } from "../../../constants"
import type Endpoint from "./endpoint"
import { endpointPoolMachine } from "./endpoint-pool-machine"

export const PRIMARY_RECOVERY_INTERVAL_MS = 10 * SECOND

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

  constructor(
    readonly name: string,
    readonly endpoints: readonly Endpoint[],
    {
      recoveryIntervalMs = PRIMARY_RECOVERY_INTERVAL_MS,
      clock,
    }: { recoveryIntervalMs?: number; clock?: SimulatedClock } = {},
  ) {
    this.#actor = createActor(endpointPoolMachine, {
      input: { size: endpoints.length, recoveryIntervalMs },
      ...(clock === undefined ? {} : { clock }),
    })
    this.#actor.on("preferredEndpointChanged", ({ index }) =>
      this.#listeners.forEach((listener) => listener(this.endpoints[index])),
    )
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
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.#listeners.clear()
    this.#actor.stop()
  }
}
