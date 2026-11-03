import type {
  EventType,
  JsonRpcProvider,
  Listener,
} from "@ethersproject/providers"
import logger from "../../../lib/logger"
import type Endpoint from "./endpoint"
import { isWebSocketTransport } from "./endpoint-machine"
import type { EndpointStatus } from "./endpoint-machine"

type WebSocketSubscription = {
  tag: string
  params: unknown[]
  processFunc: (result: unknown) => void
}

/**
 * Checks whether an endpoint refused a subscription because it doesn't
 * support that kind of subscription at all, rather than because of a
 * transient failure. This is the case when, for example, an Alchemy-specific
 * subscription like `alchemy_pendingTransactions` is sent to a standard
 * endpoint, which answers with an unknown method or unknown variant error.
 *
 * Retrying such a subscription on the same endpoint will always fail the same
 * way.
 */
export function isUnsupportedSubscriptionError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined
  const text = error instanceof Error ? error.message : String(error)
  return (
    code === -32601 ||
    code === -32602 ||
    /unknown variant|not supported|unsupported|method not found|does not exist/i.test(
      text,
    )
  )
}

type EventListener = {
  eventName: EventType
  /** What the caller passed. */
  listener: Listener
  /** What is attached to the transport; unwraps itself for `once`. */
  attached: Listener
  once: boolean
}

/**
 * Remembers WebSocket subscriptions and Ethers listeners, and keeps them on
 * one endpoint's transport, moving them when told to. WebSocket subscriptions
 * wait while the endpoint is a polling one.
 */
export default class SubscriptionManager {
  #endpoint: Endpoint

  #transport: JsonRpcProvider | undefined

  #webSocketSubscriptions: WebSocketSubscription[] = []

  #eventListeners: EventListener[] = []

  #stopWatching: () => void = () => {}

  #moves = Promise.resolve(true)

  #movesInFlight = 0

  #cleared = false

  /**
   * For each endpoint, the tags of subscriptions it refused as unsupported.
   * Subscriptions with these tags are not sent to that endpoint again.
   */
  #refusedTags = new WeakMap<Endpoint, Set<string>>()

  constructor(
    endpoint: Endpoint,
    {
      onMoved,
      signal,
    }: {
      onMoved?: (endpoint: Endpoint, moved: boolean) => void
      /** Clears everything when aborted. */
      signal?: AbortSignal
    } = {},
  ) {
    this.onMoved = onMoved
    this.#endpoint = endpoint
    this.#transport = endpoint.transport
    this.#watch(endpoint)
    signal?.addEventListener("abort", () => this.clear(), { once: true })
  }

  private readonly onMoved?: (endpoint: Endpoint, moved: boolean) => void

  get endpoint(): Endpoint {
    return this.#endpoint
  }

  on(eventName: EventType, listener: Listener): void {
    this.#add({ eventName, listener, attached: listener, once: false })
  }

  once(eventName: EventType, listener: Listener): void {
    const entry: EventListener = {
      eventName,
      listener,
      once: true,
      attached: (...args: unknown[]) => {
        this.#eventListeners = this.#eventListeners.filter(
          (existing) => existing !== entry,
        )
        listener(...args)
      },
    }
    this.#add(entry)
  }

  /** Removes `listener`, or every listener when it's left out. */
  off(eventName: EventType, listener?: Listener): void {
    const removed = this.#eventListeners.filter(
      (entry) =>
        entry.eventName === eventName &&
        (listener === undefined || entry.listener === listener),
    )
    this.#eventListeners = this.#eventListeners.filter(
      (entry) => !removed.includes(entry),
    )
    removed.forEach(({ attached }) => this.#transport?.off(eventName, attached))
  }

  async subscribe(
    tag: string,
    params: unknown[],
    processFunc: (result: unknown) => void,
  ): Promise<void> {
    const subscription = { tag, params, processFunc }
    this.#webSocketSubscriptions.push(subscription)

    const transport = this.#transport
    if (isWebSocketTransport(transport)) {
      try {
        // oxlint-disable-next-line no-underscore-dangle
        await transport._subscribe(tag, params, processFunc)
      } catch (error) {
        // Never taken, so it isn't carried to later endpoints either.
        this.#webSocketSubscriptions = this.#webSocketSubscriptions.filter(
          (existing) => existing !== subscription,
        )
        throw error
      }
    } else {
      logger.warn(
        `${this.#endpoint.label} isn't a WebSocket endpoint; the subscription waits for one.`,
        tag,
      )
    }
  }

  /**
   * Moves everything to `endpoint`, once it's ready. Moves run one at a
   * time, in the order asked for, and one that fails doesn't hold up the
   * next.
   */
  moveTo(endpoint: Endpoint): Promise<boolean> {
    this.#movesInFlight += 1
    const move = this.#moves
      .then(() => this.#moveTo(endpoint))
      .catch((error) => {
        if (!this.#cleared) {
          logger.error(`Error moving subscriptions to ${endpoint.label}`, error)
          this.onMoved?.(endpoint, false)
        }
        return false
      })
      .finally(() => {
        this.#movesInFlight -= 1
      })
    this.#moves = move
    return move
  }

  /** Forgets everything and detaches it, for good. */
  clear(): void {
    this.#cleared = true
    this.#stopWatching()
    this.#detach()
    this.#webSocketSubscriptions = []
    this.#eventListeners = []
    this.#transport = undefined
  }

  #add(entry: EventListener): void {
    this.#eventListeners.push(entry)
    const method = entry.once ? "once" : "on"
    this.#transport?.[method](entry.eventName, entry.attached)
  }

  async #moveTo(endpoint: Endpoint): Promise<boolean> {
    if (this.#cleared) {
      return false
    }
    if (endpoint !== this.#endpoint) {
      this.#stopWatching()
      this.#detach()
      this.#endpoint = endpoint
      this.#watch(endpoint)
    } else if (endpoint.builtTransport === this.#transport) {
      return true
    }
    this.#transport = undefined

    try {
      await endpoint.whenReady()
    } catch {
      if (!this.#cleared) {
        this.onMoved?.(endpoint, false)
      }
      return false
    }
    if (this.#cleared) {
      return false
    }
    if (this.#endpoint !== endpoint || this.#transport !== undefined) {
      // Moved on, or reattached, while waiting.
      return true
    }

    const transport = endpoint.transport
    this.#transport = transport

    this.#eventListeners.forEach(({ eventName, attached, once }) => {
      // A reused transport may still carry these from an earlier stint.
      transport.off(eventName, attached)
      transport[once ? "once" : "on"](eventName, attached)
    })

    if (isWebSocketTransport(transport)) {
      // One subscription the endpoint refuses shouldn't cost the others.
      // Subscriptions this endpoint refused as unsupported aren't sent to it
      // again. They're still tracked, so they're restored when the manager
      // moves to an endpoint that supports them, such as one with
      // Alchemy-specific APIs.
      const refused = this.#refusedTags.get(endpoint) ?? new Set<string>()
      this.#refusedTags.set(endpoint, refused)
      const skipped = new Map<string, number>()
      for (const { tag, params, processFunc } of this.#webSocketSubscriptions) {
        if (refused.has(tag)) {
          skipped.set(tag, (skipped.get(tag) ?? 0) + 1)
          continue
        }
        try {
          // oxlint-disable-next-line no-await-in-loop, no-underscore-dangle
          await transport._subscribe(tag, params, processFunc)
        } catch (error) {
          if (isUnsupportedSubscriptionError(error)) {
            refused.add(tag)
            skipped.set(tag, (skipped.get(tag) ?? 0) + 1)
            logger.warn(
              `${endpoint.label} doesn't support ${tag} subscriptions; keeping them for endpoints that do.`,
              error,
            )
          } else {
            logger.error(
              `Error moving a subscription to ${endpoint.label}`,
              tag,
              error,
            )
          }
        }
      }
      skipped.forEach((count, tag) =>
        logger.debug(
          `Left ${count} ${tag} subscriptions off ${endpoint.label}, which doesn't support them.`,
        ),
      )
    }

    logger.debug(
      isWebSocketTransport(transport)
        ? `Moved ${this.#eventListeners.length} listeners and ${this.#webSocketSubscriptions.length} subscriptions to ${endpoint.label}.`
        : `Moved ${this.#eventListeners.length} listeners to ${endpoint.label}; subscriptions wait for a WebSocket endpoint.`,
    )
    this.onMoved?.(endpoint, true)
    return true
  }

  /**
   * Takes everything off the current transport. A socket is closed, since
   * its subscriptions can't be taken back; its endpoint opens a fresh one
   * when next used.
   */
  #detach(): void {
    const transport = this.#transport
    if (transport === undefined) {
      return
    }
    if (isWebSocketTransport(transport)) {
      if (transport === this.#endpoint.builtTransport) {
        this.#endpoint.releaseSocket()
      } else {
        transport.destroy()
      }
    } else {
      this.#eventListeners.forEach(({ eventName, attached }) =>
        transport.off(eventName, attached),
      )
    }
  }

  /**
   * Follows the endpoint onto a new socket after a reconnect, and finishes a
   * move that failed once the endpoint becomes ready.
   */
  #watch(endpoint: Endpoint): void {
    this.#stopWatching = endpoint.onStatusChange((status: EndpointStatus) => {
      if (
        status === "Ready" &&
        this.#movesInFlight === 0 &&
        endpoint === this.#endpoint &&
        endpoint.builtTransport !== this.#transport
      ) {
        this.moveTo(endpoint).catch(() => undefined)
      }
    })
  }
}
