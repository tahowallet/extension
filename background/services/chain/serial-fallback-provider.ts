import { Network } from "@ethersproject/networks"
import {
  EventType,
  JsonRpcProvider,
  Listener,
  WebSocketProvider,
} from "@ethersproject/providers"
import { MINUTE } from "../../constants"
import logger from "../../lib/logger"

// Back off by this amount as a base, exponentiated by attempts and jittered.
const BASE_BACKOFF_MS = 150
// Reset backoffs after 5 minutes.
const COOLDOWN_PERIOD = 5 * MINUTE
// Retry 3 times before falling back to the next provider.
const MAX_RETRIES = 3

/**
 * Wait the given number of ms, then run the provided function. Returns a
 * promise that will resolve after the delay has elapsed and the passed
 * function has executed, with the result of the passed function.
 */
function waitAnd<T, E extends Promise<T>>(
  waitMs: number,
  fn: () => E
): Promise<T> {
  return new Promise((resolve) => {
    // TODO setTimeout rather than browser.alarms here could mean this would
    // hang when transitioning to a transient background page? Can we do this
    // with browser.alarms?
    setTimeout(() => {
      resolve(fn())
    }, waitMs)
  })
}

/**
 * Given the number of the backoff being executed, returns a jittered number of
 * ms to back off before making the next attempt.
 */
function backedOffMs(backoffCount: number): number {
  const backoffSlotStart = BASE_BACKOFF_MS ** backoffCount
  const backoffSlotEnd = BASE_BACKOFF_MS ** (backoffCount + 1)

  return backoffSlotStart + Math.random() * (backoffSlotEnd - backoffSlotStart)
}

/**
 * Returns true if the given provider is using a WebSocket AND the WebSocket is
 * either closing or already closed. Ethers does not provide direct access to
 * this information, nor does it attempt to reconnect in these cases.
 */
function isClosedOrClosingWebSocketProvider(
  provider: JsonRpcProvider
): boolean {
  if (provider instanceof WebSocketProvider) {
    // Digging into the innards of Ethers here because there's no
    // other way to get access to the WebSocket connection situation.
    // eslint-disable-next-line no-underscore-dangle
    const webSocket = provider._websocket as WebSocket

    return (
      webSocket.readyState === WebSocket.CLOSING ||
      webSocket.readyState === WebSocket.CLOSED
    )
  }

  return false
}

/**
 * The SerialFallbackProvider is an Ethers JsonRpcProvider that can fall back
 * through a series of providers in case previous ones fail.
 *
 * In case of server errors, this provider attempts a number of exponential
 * backoffs and retries before falling back to the next provider in the list.
 * WebSocketProviders in the list are checked for WebSocket connections, and
 * attempt reconnects if the underlying WebSocket disconnects.
 *
 * Additionally, subscriptions are tracked and, if the current provider is a
 * WebSocket provider, they are restored on reconnect.
 */
export default class SerialFallbackProvider extends JsonRpcProvider {
  // Functions that will create and initialize a new provider, in priority
  // order.
  private providerCreators: [
    () => WebSocketProvider,
    ...(() => JsonRpcProvider)[]
  ]

  // The currently-used provider, produced by the provider-creator at
  // currentProviderIndex.
  private currentProvider: JsonRpcProvider

  // The index of the provider creator that created the current provider. Used
  // for reconnects when relevant.
  private currentProviderIndex = 0

  // Information on the current backoff state. This is used to ensure retries
  // and reconnects back off exponentially.
  private currentBackoff = {
    providerIndex: 0,
    backoffMs: BASE_BACKOFF_MS,
    backoffCount: 0,
    lastBackoffTime: 0,
  }

  // Information on WebSocket-style subscriptions. Tracked here so as to
  // restore them in case of WebSocket disconnects.
  private subscriptions: {
    tag: string
    param: unknown[]
    processFunc: (result: unknown) => void
  }[] = []

  // Information on event subscriptions, which can be restored on non-WebSocket
  // subscriptions and WebSocket subscriptions both.
  private eventSubscriptions: {
    eventName: EventType
    listener: Listener | (Listener & { wrappedListener: Listener })
    once: boolean
  }[] = []

  constructor(
    firstProviderCreator: () => WebSocketProvider,
    ...remainingProviderCreators: (() => JsonRpcProvider)[]
  ) {
    const firstProvider = firstProviderCreator()

    super(firstProvider.connection, firstProvider.network)

    this.currentProvider = firstProvider
    this.providerCreators = [firstProviderCreator, ...remainingProviderCreators]
  }

  /**
   * Override the core `perform` method to handle disconnects and other errors
   * that should trigger retries. Ethers already does internal retrying, but
   * this retry methodology eventually falls back on another provider, handles
   * WebSocket disconnects, and restores subscriptions where
   * possible/necessary.
   */
  async send(method: string, params: unknown): Promise<unknown> {
    try {
      if (isClosedOrClosingWebSocketProvider(this.currentProvider)) {
        // Detect disconnected WebSocket and immediately throw.
        throw new Error("WebSocket is already in CLOSING")
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await this.currentProvider.send(method, params as any)
    } catch (error) {
      // Awful, but what can ya do.
      const stringifiedError = String(error)

      if (
        stringifiedError.match(/WebSocket is already in CLOSING|bad response/)
      ) {
        const backoff = this.backoffFor(this.currentProviderIndex)
        if (typeof backoff === "undefined") {
          logger.debug(
            "Attempting to connect new provider after error",
            error,
            "."
          )
          this.disconnectCurrentProvider()

          this.currentProviderIndex += 1
          if (this.currentProviderIndex < this.providerCreators.length) {
            // Try again with the next provider.
            await this.reconnectProvider()

            return await this.send(method, params)
          }

          // If we've looped around, set us up for the next call, but fail the
          // current one since we've gone through every available provider. Note
          // that this may happen over time, but we still fail the request that
          // hits the end of the list.
          this.currentProviderIndex = 0

          // Reconnect, but don't wait for the connection to go through.
          this.reconnectProvider()

          throw error
        } else {
          logger.debug(
            "Backing off for",
            backoff,
            "and retrying: ",
            method,
            params
          )

          return await waitAnd(backoff, async () => {
            if (isClosedOrClosingWebSocketProvider(this.currentProvider)) {
              await this.reconnectProvider()
            }

            return this.send(method, params)
          })
        }
      }

      logger.debug(
        "Skipping fallback for unidentified error",
        error,
        "for provider",
        this.currentProvider
      )

      throw error
    }
  }

  private async disconnectCurrentProvider() {
    logger.debug(
      "Disconnecting current provider; websocket: ",
      this.currentProvider instanceof WebSocketProvider,
      "."
    )
    if (this.currentProvider instanceof WebSocketProvider) {
      this.currentProvider.destroy()
    } else {
      // For non-WebSocket providers, kill all subscriptions so the listeners
      // won't fire; the next provider will pick them up. We could lose events
      // in between, but if we're considering the current provider dead, let's
      // assume we would lose them anyway.
      this.eventSubscriptions.forEach(({ eventName }) =>
        this.removeAllListeners(eventName)
      )
    }
  }

  async subscribe(
    tag: string,
    param: Array<unknown>,
    processFunc: (result: unknown) => void
  ): Promise<void> {
    const subscription = { tag, param, processFunc }
    this.subscriptions.push(subscription)

    if (this.currentProvider instanceof WebSocketProvider) {
      // eslint-disable-next-line no-underscore-dangle
      await this.currentProvider._subscribe(tag, param, processFunc)
    } else {
      logger.warn(
        "Current provider is not a WebSocket provider; subscription " +
          "will not work until a WebSocket provider connects."
      )
    }
  }

  async detectNetwork(): Promise<Network> {
    return this.currentProvider.detectNetwork()
  }

  // Overriding internal functionality here to support event listener
  // restoration on reconnect.
  // eslint-disable-next-line no-underscore-dangle
  on(eventName: EventType, listener: Listener): this {
    this.eventSubscriptions.push({
      eventName,
      listener,
      once: false,
    })

    this.currentProvider.on(eventName, listener)

    return this
  }

  once(eventName: EventType, listener: Listener): this {
    const adjustedListener = this.listenerWithCleanup(eventName, listener)

    this.eventSubscriptions.push({
      eventName,
      listener: adjustedListener,
      once: true,
    })

    this.currentProvider.once(eventName, listener)

    return this
  }

  /**
   * Removes one or all listeners for a given event.
   *
   * Ensures these will not be restored during a reconnect.
   */
  off(eventName: EventType, listenerToRemove?: Listener): this {
    this.eventSubscriptions = this.eventSubscriptions.filter(
      ({ eventName: savedEventName, listener: savedListener }) => {
        if (savedEventName === eventName) {
          // No explicit listener to remove = remove all listeners.
          if (
            typeof listenerToRemove === "undefined" ||
            listenerToRemove === null
          ) {
            return true
          }

          // If the listener is wrapped, use that to check against the
          // specified listener to remove.
          if ("wrappedListener" in savedListener) {
            return savedListener.wrappedListener === listenerToRemove
          }

          // Otherwise, directly compare.
          return savedListener === listenerToRemove
        }

        return false
      }
    )

    this.currentProvider.off(eventName, listenerToRemove)

    return this
  }

  /**
   * Wraps an Ethers listener function meant to only be invoked once with
   * cleanup to ensure it won't be resubscribed in case of a provider switch.
   */
  private listenerWithCleanup(
    eventName: EventType,
    listenerToWrap: Listener
  ): Listener & { wrappedListener: Listener } {
    const wrappedListener = (
      ...params: Parameters<Listener>
    ): ReturnType<Listener> => {
      try {
        listenerToWrap(...params)
      } finally {
        this.eventSubscriptions = this.eventSubscriptions.filter(
          ({ eventName: storedEventName, listener, once }) =>
            eventName !== storedEventName ||
            listener !== wrappedListener ||
            once !== true
        )
      }
    }

    wrappedListener.wrappedListener = listenerToWrap

    return wrappedListener
  }

  /**
   * Reconnects the currently-selected provider. If the current provider index
   * has been somehow set out of range, resets it to 0.
   */
  private async reconnectProvider() {
    if (this.currentProviderIndex >= this.providerCreators.length) {
      this.currentProviderIndex = 0
    }

    logger.debug(
      "Reconnecting provider at index",
      this.currentProviderIndex,
      "..."
    )

    this.currentProvider = this.providerCreators[this.currentProviderIndex]()
    this.resubscribe()

    // TODO After a longer backoff, attempt to reset the current provider to 0.
  }

  private async resubscribe() {
    logger.debug("Resubscribing subscriptions...")

    if (this.currentProvider instanceof WebSocketProvider) {
      const provider = this.currentProvider as WebSocketProvider

      // Chain promises to serially resubscribe.
      //
      // TODO If anything fails along the way, it should yield the same kind of
      // TODO backoff as a regular `perform`.
      await this.subscriptions.reduce(
        (previousPromise, { tag, param, processFunc }) =>
          previousPromise.then(() =>
            waitAnd(backedOffMs(0), () =>
              // Direct subscriptions are internal, but we want to be able to
              // restore them.
              // eslint-disable-next-line no-underscore-dangle
              provider._subscribe(tag, param, processFunc)
            )
          ),
        Promise.resolve()
      )
    } else if (this.subscriptions.length > 0) {
      logger.warn(
        `Cannot resubscribe ${this.subscriptions.length} subscription(s) ` +
          `as the current provider is not a WebSocket provider; waiting ` +
          `until a WebSocket provider connects to restore subscriptions ` +
          `properly.`
      )
    }

    this.eventSubscriptions.forEach(({ eventName, listener, once }) => {
      if (once) {
        this.currentProvider.once(eventName, listener)
      } else {
        this.currentProvider.on(eventName, listener)
      }
    })

    logger.debug("Subscriptions resubscribed...")
  }

  /**
   * Computes the backoff time for the given provider index. If the provider
   * index is new, starts with the base backoff; if the provider index is
   * unchanged, computes a jittered exponential backoff. If the current
   * provider has already exceeded its maximum retries, returns undefined to
   * signal the provider should be considered dead for the time being.
   *
   * Backoffs respect a cooldown time after which they reset down to the base
   * backoff time.
   */
  private backoffFor(providerIndex: number): number | undefined {
    const {
      providerIndex: existingProviderIndex,
      backoffCount,
      lastBackoffTime,
    } = this.currentBackoff

    if (backoffCount > MAX_RETRIES) {
      return undefined
    }

    if (existingProviderIndex !== providerIndex) {
      this.currentBackoff = {
        providerIndex,
        backoffMs: BASE_BACKOFF_MS,
        backoffCount: 0,
        lastBackoffTime: 0,
      }
    } else if (Date.now() - lastBackoffTime > COOLDOWN_PERIOD) {
      this.currentBackoff = {
        providerIndex,
        backoffMs: BASE_BACKOFF_MS,
        backoffCount: 0,
        lastBackoffTime: 0,
      }
    } else {
      // The next backoff slot starts at the current minimum backoff and
      // extends until the start of the next backoff. This specific backoff is
      // randomized within that slot.
      const newBackoffCount = backoffCount + 1
      const backoffMs = backedOffMs(newBackoffCount)

      this.currentBackoff = {
        providerIndex,
        backoffMs,
        backoffCount: newBackoffCount,
        lastBackoffTime: Date.now(),
      }
    }

    return this.currentBackoff.backoffMs
  }
}
