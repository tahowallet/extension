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

  constructor(
    endpoint: Endpoint,
    private readonly onMoved?: (endpoint: Endpoint, moved: boolean) => void,
  ) {
    this.#endpoint = endpoint
    this.#transport = endpoint.transport
    this.#watch(endpoint)
  }

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
      // oxlint-disable-next-line no-underscore-dangle
      await transport._subscribe(tag, params, processFunc)
    } else {
      logger.warn(
        "Not a WebSocket endpoint; the subscription waits for one.",
        tag,
      )
    }
  }

  /**
   * Moves everything to `endpoint`, once it's ready. Moves run one at a
   * time, in the order asked for.
   */
  moveTo(endpoint: Endpoint): Promise<boolean> {
    this.#moves = this.#moves.then(() => this.#moveTo(endpoint))
    return this.#moves
  }

  /** Forgets everything and detaches it. */
  clear(): void {
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
      this.onMoved?.(endpoint, false)
      return false
    }
    if (this.#endpoint !== endpoint || this.#transport !== undefined) {
      // Moved on, or reattached, while waiting.
      return true
    }

    const transport = endpoint.transport
    this.#transport = transport

    if (isWebSocketTransport(transport)) {
      await this.#webSocketSubscriptions.reduce(
        (previous, { tag, params, processFunc }) =>
          previous.then(() =>
            // oxlint-disable-next-line no-underscore-dangle
            transport._subscribe(tag, params, processFunc),
          ),
        Promise.resolve(),
      )
    }

    this.#eventListeners.forEach(({ eventName, attached, once }) => {
      // A reused transport may still carry these from an earlier stint.
      transport.off(eventName, attached)
      transport[once ? "once" : "on"](eventName, attached)
    })

    this.onMoved?.(endpoint, true)
    return true
  }

  /**
   * Takes everything off the current transport. A socket is closed, since
   * its subscriptions can't be taken back; its endpoint opens a fresh one.
   */
  #detach(): void {
    const transport = this.#transport
    if (transport === undefined) {
      return
    }
    if (isWebSocketTransport(transport)) {
      transport.destroy()
    } else {
      this.#eventListeners.forEach(({ eventName, attached }) =>
        transport.off(eventName, attached),
      )
    }
  }

  /** Follows the endpoint onto a new socket after a reconnect. */
  #watch(endpoint: Endpoint): void {
    this.#stopWatching = endpoint.onStatusChange((status: EndpointStatus) => {
      if (
        status === "Ready" &&
        endpoint === this.#endpoint &&
        this.#transport !== undefined &&
        endpoint.builtTransport !== this.#transport
      ) {
        this.moveTo(endpoint).catch(() => undefined)
      }
    })
  }
}
