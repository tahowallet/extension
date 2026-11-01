import { JsonRpcProvider } from "@ethersproject/providers"
import { Actor, createActor, SimulatedClock, SnapshotFrom } from "xstate"
import logger from "../../../lib/logger"
import {
  EndpointHealthOptions,
  endpointMachine,
  EndpointStatus,
} from "./endpoint-machine"
import { redactedHost } from "./endpoint-label"

/**
 * `managed` endpoints are run by Taho (Boar); `method-specific` ones serve
 * only the methods they list (Flashbots); `standard` ones serve everything
 * else, in order.
 */
export type EndpointKind = "managed" | "method-specific" | "standard"

export type EndpointConfig = {
  kind: EndpointKind
  url?: string
  /**
   * Method-name prefixes for non-standard namespaces the endpoint serves,
   * such as `alchemy_`.
   */
  capabilities?: string[]
  /** For method-specific endpoints, the method prefixes they serve; all when empty. */
  methods?: string[]
  createTransport: () => JsonRpcProvider
}

/** How an endpoint's health maps onto the old circuit breaker states. */
export type BreakerTransition = "open" | "half-open" | "closed"

const AVAILABLE: ReadonlySet<string> = new Set([
  "Unbuilt",
  "Connecting",
  "Ready",
])

export class NoEndpointAvailableError extends Error {
  constructor() {
    super("NETWORK_ERROR: circuit open and no fallback available")
  }
}

export class EndpointDisposedError extends Error {
  constructor() {
    super("Endpoint has been disposed")
  }
}

const seconds = (ms: number) => `${Math.round(ms / 1000)} seconds`

/** Logs a change in an endpoint's health or socket. */
function logStatusChange(
  label: string,
  previous: SnapshotFrom<typeof endpointMachine>,
  next: SnapshotFrom<typeof endpointMachine>,
): void {
  const from = previous.value as EndpointStatus
  const to = next.value as EndpointStatus
  const { cooldownMs, options, transport } = next.context
  const replacedSocket =
    previous.context.transport !== undefined &&
    transport !== previous.context.transport

  if (to === "CoolingDown") {
    const reason =
      from === "Ready"
        ? `after ${options.failureThreshold} ${options.failureThreshold === 1 ? "failure" : "failures"} within ${seconds(options.failureWindowMs)}`
        : from === "Connecting"
          ? "since its socket didn't open"
          : "since its probe failed"
    logger.warn(
      `${label} is cooling down for ${seconds(cooldownMs)} ${reason}.`,
    )
  } else if (to === "Probing") {
    logger.info(
      `${label} is probing after its cooldown${replacedSocket ? ", on a new socket" : ""}.`,
    )
  } else if (to === "Ready" && from === "Probing") {
    logger.info(`${label} recovered.`)
  } else if (to === "Ready" && from === "Connecting") {
    logger.debug(`${label} opened its socket.`)
  } else if (to === "Connecting" && from === "Ready") {
    logger.info(`${label} lost its socket and is opening a new one.`)
  }
}

/** A configured RPC endpoint, its transport, and its health. */
export default class Endpoint {
  readonly #actor: Actor<typeof endpointMachine>

  /** Names the endpoint in logs, without the parts of its URL that hold keys. */
  readonly label: string

  readonly #statusListeners = new Set<(status: EndpointStatus) => void>()

  #status: EndpointStatus = "Unbuilt"

  #stopFollowingSignal: () => void = () => {}

  constructor(
    readonly config: EndpointConfig,
    {
      label,
      onBreakerTransition,
      options,
      clock,
      signal,
    }: {
      /** See {@link endpointLabel}; defaults to the kind and host. */
      label?: string
      onBreakerTransition?: (next: BreakerTransition) => void
      /** Disposes the endpoint when aborted. */
      signal?: AbortSignal
      options?: Partial<EndpointHealthOptions>
      /** Simulated time, for tests. */
      clock?: SimulatedClock
    } = {},
  ) {
    this.label = label ?? `${config.kind} ${redactedHost(config.url)}`
    this.#actor = createActor(endpointMachine, {
      input: {
        createTransport: config.createTransport,
        options,
        now: clock === undefined ? undefined : () => clock.now(),
      },
      ...(clock === undefined ? {} : { clock }),
    })

    let previousSnapshot = this.#actor.getSnapshot()
    this.#actor.subscribe((snapshot) => {
      const previous = this.#status
      const next = snapshot.value as EndpointStatus
      const lastSnapshot = previousSnapshot
      previousSnapshot = snapshot
      if (next === previous) {
        return
      }
      this.#status = next
      logStatusChange(this.label, lastSnapshot, snapshot)

      if (next === "CoolingDown") {
        onBreakerTransition?.("open")
      } else if (next === "Probing") {
        onBreakerTransition?.("half-open")
      } else if (next === "Ready" && previous === "Probing") {
        onBreakerTransition?.("closed")
      }
      this.#statusListeners.forEach((listener) => listener(next))
    })
    this.#actor.start()

    if (signal?.aborted) {
      this.dispose()
    } else if (signal !== undefined) {
      const abort = () => this.dispose()
      signal.addEventListener("abort", abort, { once: true })
      this.#stopFollowingSignal = () =>
        signal.removeEventListener("abort", abort)
    }
  }

  get kind(): EndpointKind {
    return this.config.kind
  }

  get capabilities(): string[] {
    return this.config.capabilities ?? []
  }

  get status(): EndpointStatus {
    return this.#status
  }

  /** Whether a request may be sent to this endpoint now. */
  get isAvailable(): boolean {
    return AVAILABLE.has(this.#status)
  }

  get isDisposed(): boolean {
    return this.#status === "Disposed"
  }

  /** The transport, built on first use. */
  get transport(): JsonRpcProvider {
    this.build()
    const { transport } = this.#actor.getSnapshot().context
    if (transport === undefined) {
      throw new EndpointDisposedError()
    }
    return transport
  }

  /** The transport if it has been built, without building it. */
  get builtTransport(): JsonRpcProvider | undefined {
    return this.#actor.getSnapshot().context.transport
  }

  /**
   * Resolves once the endpoint is ready for requests, building it if needed.
   * Rejects if it starts cooling down or is disposed first.
   */
  whenReady(): Promise<void> {
    this.build()

    return new Promise((resolve, reject) => {
      const check = (status: EndpointStatus) => {
        if (status === "Ready") {
          unsubscribe()
          resolve()
        } else if (status === "Disposed") {
          unsubscribe()
          reject(new EndpointDisposedError())
        } else if (status !== "Connecting") {
          unsubscribe()
          reject(new Error(`NETWORK_ERROR: endpoint is ${status}`))
        }
      }
      const unsubscribe = this.onStatusChange(check)
      check(this.#status)
    })
  }

  /**
   * Sends a request, waiting for a WebSocket that is still connecting. A
   * cooling-down endpoint refuses requests unless they're probes.
   */
  send(
    method: string,
    params: unknown[],
    { probe = false }: { probe?: boolean } = {},
  ): Promise<unknown> {
    const { transport } = this
    if (this.#status === "Connecting") {
      return this.whenReady().then(() => this.transport.send(method, params))
    }
    if (!probe && !this.isAvailable) {
      return Promise.reject(new NoEndpointAvailableError())
    }
    return transport.send(method, params)
  }

  /** Builds the transport if it isn't yet. */
  build(): void {
    if (this.isDisposed) {
      throw new EndpointDisposedError()
    }
    if (this.#status === "Unbuilt") {
      this.#actor.send({ type: "FIRST_USE" })
    }
  }

  recordSuccess(): void {
    this.#actor.send({ type: "REQUEST_SUCCEEDED" })
  }

  recordFailure(): void {
    this.#actor.send({ type: "REQUEST_FAILED" })
  }

  onStatusChange(listener: (status: EndpointStatus) => void): () => void {
    this.#statusListeners.add(listener)
    return () => this.#statusListeners.delete(listener)
  }

  /** Tears the transport down for good; nothing is built afterwards. */
  dispose(): void {
    this.#stopFollowingSignal()
    this.#actor.send({ type: "DISPOSE" })
  }
}
