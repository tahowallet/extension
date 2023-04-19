import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
  EventType,
  JsonRpcProvider,
  Listener,
  WebSocketProvider,
} from "@ethersproject/providers"
import { utils } from "ethers"
import { getNetwork } from "@ethersproject/networks"
import {
  SECOND,
  ALCHEMY_SUPPORTED_CHAIN_IDS,
  RPC_METHOD_PROVIDER_ROUTING,
} from "../../constants"
import logger from "../../lib/logger"
import { AnyEVMTransaction } from "../../networks"
import { AddressOnNetwork } from "../../accounts"
import { transactionFromEthersTransaction } from "./utils"
import {
  ALCHEMY_KEY,
  transactionFromAlchemyWebsocketTransaction,
} from "../../lib/alchemy"

// Back off by this amount as a base, exponentiated by attempts and jittered.
const BASE_BACKOFF_MS = 400
// Retry 3 times before falling back to the next provider.
const MAX_RETRIES_PER_PROVIDER = 3
// Wait 10 seconds between primary provider reconnect attempts.
const PRIMARY_PROVIDER_RECONNECT_INTERVAL = 10 * SECOND
// Wait 2 seconds after a primary provider is created before resubscribing.
const WAIT_BEFORE_SUBSCRIBING = 2 * SECOND
// Wait 100ms before attempting another send if a websocket provider is still connecting.
const WAIT_BEFORE_SEND_AGAIN = 100
// Percentage of .send calls to route to alchemy
const ALCHEMY_RPC_CALL_PERCENTAGE = 0
// How long before a cached balance is considered stale
const BALANCE_TTL = 1 * SECOND
// How often to cleanup our hasCode and balance caches.
const CACHE_CLEANUP_INTERVAL = 10 * SECOND
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
 * Return a jittered amount of ms to backoff bounded between 400 and 800 ms
 */
function backedOffMs(): number {
  return BASE_BACKOFF_MS + 400 * Math.random()
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
 * Returns true if the given provider is using a WebSocket AND the WebSocket is
 * connecting. Ethers does not provide direct access to this information.
 */
function isConnectingWebSocketProvider(provider: JsonRpcProvider): boolean {
  if (provider instanceof WebSocketProvider) {
    // Digging into the innards of Ethers here because there's no
    // other way to get access to the WebSocket connection situation.
    // eslint-disable-next-line no-underscore-dangle
    const webSocket = provider._websocket as WebSocket
    return webSocket.readyState === WebSocket.CONNECTING
  }

  return false
}

/**
 * Return the decision whether a given RPC call should be routed to the alchemy provider
 * or the generic provider.
 *
 * Checking whether is alchemy supported is a non concern for this function!
 *
 * @param chainID string chainID to handle chain specific routings
 * @param method the current RPC method
 * @returns true | false whether the method on a given network should be routed to alchemy or can be sent over the generic provider
 */
function alchemyOrDefaultProvider(chainID: string, method: string): boolean {
  return (
    RPC_METHOD_PROVIDER_ROUTING.everyChain.some((m: string) =>
      method.startsWith(m)
    ) ||
    (RPC_METHOD_PROVIDER_ROUTING[Number(chainID)] ?? []).some((m: string) =>
      method.startsWith(m)
    )
  )
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
    () => WebSocketProvider | JsonRpcProvider,
    ...(() => JsonRpcProvider)[]
  ]

  // The currently-used provider, produced by the provider-creator at
  // currentProviderIndex.
  private currentProvider: JsonRpcProvider

  private alchemyProvider: JsonRpcProvider | undefined

  /**
   * This object holds all messages that are either being sent to a provider
   * and waiting for a response, or are in the process of being backed off due
   * to bad network conditions or hitting rate limits.
   */
  public messagesToSend: {
    [id: symbol]: {
      method: string
      params: unknown[]
      backoffCount: number
      providerIndex: number
    }
  } = {}

  private alchemyProviderCreator:
    | (() => WebSocketProvider | JsonRpcProvider)
    | undefined

  supportsAlchemy = false

  /**
   * Since our architecture follows a pattern of using distinct provider instances
   * per network - and we know that a given provider will never switch its network
   * (rather - we will switch the provider the extension is using) - we can avoid
   * eth_chainId RPC calls.
   */
  private cachedChainId: string

  // The index of the provider creator that created the current provider. Used
  // for reconnects when relevant.
  private currentProviderIndex = 0

  // TEMPORARY cache for latest account balances to reduce number of rpc calls
  // This is intended as a temporary fix to the burst of account enrichment that
  // happens when the extension is first loaded up as a result of activity emission
  // inside of chainService.connectChainService
  private latestBalanceCache: {
    [address: string]: {
      balance: string
      updatedAt: number
    }
  } = {}

  // TEMPORARY cache for if an address has code to reduce number of rpc calls
  // This is intended as a temporary fix to the burst of account enrichment that
  // happens when the extension is first loaded up as a result of activity emission
  // inside of chainService.connectChainService
  // There is no TTL here as the cache will get reset every time the extension is
  // reloaded and the property of having code updates quite rarely.
  private latestHasCodeCache: {
    [address: string]: {
      hasCode: boolean
    }
  } = {}

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
    // Internal network type useful for helper calls, but not exposed to avoid
    // clashing with Ethers's own `network` stuff.
    private chainID: string,
    providerCreators: Array<{
      type: "alchemy" | "generic"
      creator: () => WebSocketProvider | JsonRpcProvider
    }>
  ) {
    const [firstProviderCreator, ...remainingProviderCreators] =
      providerCreators.map((pc) => pc.creator)

    const firstProvider = firstProviderCreator()

    super(firstProvider.connection, firstProvider.network)

    this.currentProvider = firstProvider

    const alchemyProviderCreator = providerCreators.find(
      (creator) => creator.type === "alchemy"
    )

    if (alchemyProviderCreator) {
      this.supportsAlchemy = true
      this.alchemyProviderCreator = alchemyProviderCreator.creator
      this.alchemyProvider = this.alchemyProviderCreator()
    }

    setInterval(() => {
      this.attemptToReconnectToPrimaryProvider()
      this.attemptToReconnectToAlchemyProvider()
    }, PRIMARY_PROVIDER_RECONNECT_INTERVAL)

    setInterval(() => {
      this.cleanupStaleCacheEntries()
    }, CACHE_CLEANUP_INTERVAL)

    this.cachedChainId = utils.hexlify(Number(chainID))
    this.providerCreators = [firstProviderCreator, ...remainingProviderCreators]
  }

  /**
   * This method takes care of sending off a message via an underlying provider
   * as well as backing off and failing over to other providers should a given
   * provider be disconnected.
   *
   * @param messageId The unique identifier of a given message
   * @returns The result of sending the message to a given provider
   */
  private async routeRpcCall(messageId: symbol): Promise<unknown> {
    const { method, params } = this.messagesToSend[messageId]

    /*
     * Checking the cache needs to happen inside or routeRpcCall,
     * This gives us multiple chances to get a cache hit throughout
     * a given message's retry cycle rather than just when the message
     * is first initiated
     */
    const cachedResult = this.checkForCachedResult(method, params)

    if (typeof cachedResult !== "undefined") {
      // Cache hit! - return early
      delete this.messagesToSend[messageId]
      return cachedResult
    }

    try {
      if (isClosedOrClosingWebSocketProvider(this.currentProvider)) {
        // Detect disconnected WebSocket and immediately throw.
        throw new Error("WebSocket is already in CLOSING")
      }

      if (isConnectingWebSocketProvider(this.currentProvider)) {
        // If the websocket is still connecting, wait and try to send again.
        return await waitAnd(WAIT_BEFORE_SEND_AGAIN, async () =>
          this.routeRpcCall(messageId)
        )
      }

      if (
        // Force some methods to be handled by alchemy if we're on an alchemy supported chain
        this.alchemyProvider &&
        alchemyOrDefaultProvider(this.cachedChainId, method)
      ) {
        if (this.alchemyProvider) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await this.alchemyProvider.send(method, params)
          delete this.messagesToSend[messageId]
          return result
        }
        if (/^alchemy_|^eth_subscribe$/.test(method)) {
          delete this.messagesToSend[messageId]
          throw new Error(
            `Calling ${method} is not supported on ${this.currentProvider.network.name}`
          )
        }
      }

      if (
        this.alchemyProvider &&
        Math.random() < ALCHEMY_RPC_CALL_PERCENTAGE / 100
      ) {
        const result = await this.alchemyProvider.send(method, params)
        delete this.messagesToSend[messageId]
        return result
      }
      const result = await this.currentProvider.send(method, params)
      // If https://github.com/tc39/proposal-decorators ever gets out of Stage 3
      // cleaning up the messageToSend object seems like a great job for a decorator
      delete this.messagesToSend[messageId]
      return result
    } catch (error) {
      // Awful, but what can ya do.
      const stringifiedError = String(error)

      if (
        /**
         * WebSocket is already in CLOSING - We are reconnecting
         * bad response - error on the endpoint provider's side
         * missing response - we might be disconnected due to network instability
         * we can't execute this request - ankr rate limit hit
         */
        stringifiedError.match(
          /WebSocket is already in CLOSING|bad response|missing response|we can't execute this request/
        )
      ) {
        if (this.shouldSendMessageOnNextProvider(messageId)) {
          // If there is another provider to try - try to send the message on that provider
          if (this.currentProviderIndex + 1 < this.providerCreators.length) {
            return await this.attemptToSendMessageOnNewProvider(messageId)
          }

          // Otherwise, set us up for the next call, but fail the
          // current one since we've gone through every available provider. Note
          // that this may happen over time, but we still fail the request that
          // hits the end of the list.
          this.currentProviderIndex = 0

          // Reconnect, but don't wait for the connection to go through.
          this.reconnectProvider()
          delete this.messagesToSend[messageId]
          throw error
        } else {
          const backoff = this.backoffFor(messageId)
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

            logger.debug("Retrying", method, params)
            return this.routeRpcCall(messageId)
          })
        }
      }

      logger.debug(
        "Skipping fallback for unidentified error",
        error,
        "for provider",
        this.currentProvider
      )

      delete this.messagesToSend[messageId]
      throw error
    }
  }

  /**
   * A method that caches calls to eth_getCode and eth_getBalance
   *
   * @param result result of a successful call to an rpc provider
   * @param method rpc method sent to the rpc provider
   * @param params corresponding rpc params sent to the rpc provider
   */
  private conditionallyCacheResult(
    result: unknown,
    { method, params }: { method: string; params: unknown }
  ): void {
    if (method === "eth_getBalance" && (params as string[])[1] === "latest") {
      const address = (params as string[])[0]
      this.latestBalanceCache[address] = {
        balance: result as string,
        updatedAt: Date.now(),
      }
    }

    // @TODO Remove once initial activity load is refactored.
    if (method === "eth_getCode" && (params as string[])[1] === "latest") {
      const address = (params as string[])[0]
      this.latestHasCodeCache[address] = {
        hasCode: result as boolean,
      }
    }
  }

  /**
   * A method that checks the local cache for any previous calls to eth_getCode
   * or any recent calls to eth_getBalance for a given address
   *
   * @param method the current RPC method
   * @param params the parameters for the current rpc method
   * @returns A cached result for the given method, or `undefined` indicating a cache miss
   */
  private checkForCachedResult(
    method: string,
    params: unknown
  ): string | boolean | undefined {
    // @TODO Remove once initial activity load is refactored.
    if (method === "eth_getBalance" && (params as string[])[1] === "latest") {
      const address = (params as string[])[0]
      const now = Date.now()
      const lastUpdate = this.latestBalanceCache[address]?.updatedAt
      if (lastUpdate && now < lastUpdate + BALANCE_TTL) {
        return this.latestBalanceCache[address].balance
      }
    }

    // @TODO Remove once initial activity load is refactored.
    if (method === "eth_getCode" && (params as string[])[1] === "latest") {
      const address = (params as string[])[0]
      if (typeof this.latestHasCodeCache[address] !== "undefined") {
        return this.latestHasCodeCache[address].hasCode
      }
    }

    return undefined
  }

  /**
   * Cache cleanup to mitigate unbounded growth of our hasCode and balance caches.
   * @TODO remove this method once loading of initial activities is refactored.
   */
  cleanupStaleCacheEntries(): void {
    const balanceCache = Object.entries(this.latestBalanceCache)
    const hasCodeCache = Object.keys(this.latestHasCodeCache)
    if (balanceCache.length > 0) {
      logger.info(
        `Cleaning up ${this.network.chainId} balance cache, ${balanceCache.length} entries`
      )
      const now = Date.now()
      balanceCache.forEach(([address, balance]) => {
        if (balance.updatedAt < now - BALANCE_TTL) {
          delete this.latestBalanceCache[address]
        }
      })
    }

    if (hasCodeCache.length > 0) {
      logger.info(
        `Cleaning up ${this.network.chainId} hasCode cache, ${hasCodeCache.length} entries`
      )

      this.latestHasCodeCache = {}
    }
  }

  /**
   * Called when a message has failed MAX_RETRIES_PER_PROVIDER times on a given
   * provider, and is ready to be sent to the next provider in line
   *
   * @param messageId The unique identifier of a given message
   * @returns The result of sending the message via the next provider
   */
  private async attemptToSendMessageOnNewProvider(
    messageId: symbol
  ): Promise<unknown> {
    this.disconnectCurrentProvider()
    this.currentProviderIndex += 1
    // Try again with the next provider.
    await this.reconnectProvider()
    return this.routeRpcCall(messageId)
  }

  /**
   * Override the core `send` method to handle disconnects and other errors
   * that should trigger retries. Ethers already does internal retrying, but
   * this retry methodology eventually falls back on another provider, handles
   * WebSocket disconnects, and restores subscriptions where
   * possible/necessary.
   */
  override async send(method: string, params: unknown[]): Promise<unknown> {
    // Since we can reliably return the chainId with absolutely no communication with
    // the provider - we can return it without needing to worry about routing rpc calls
    if (method === "eth_chainId") {
      return this.cachedChainId
    }

    // Generate a unique symbol to track the message and store message information
    const id = Symbol(method)
    this.messagesToSend[id] = {
      method,
      params,
      backoffCount: 0,
      providerIndex: this.currentProviderIndex,
    }

    // Start routing message down our waterfall of rpc providers
    const result = await this.routeRpcCall(id)

    // Cache results for method/param combinations that are frequently called subsequently
    this.conditionallyCacheResult(result, { method, params })

    return result
  }

  /**
   * Exposes direct WebSocket subscription by JSON-RPC method. Takes immediate
   * effect if the current underlying provider is a WebSocketProvider. If it is
   * not, queues the subscription up for when a WebSocketProvider can connect.
   */
  async subscribe(
    tag: string,
    param: Array<unknown>,
    processFunc: (result: unknown) => void
  ): Promise<void> {
    const subscription = { tag, param, processFunc }

    if (this.currentProvider instanceof WebSocketProvider) {
      // eslint-disable-next-line no-underscore-dangle
      await this.currentProvider._subscribe(tag, param, processFunc)
      this.subscriptions.push(subscription)
    } else {
      logger.warn(
        "Current provider is not a WebSocket provider; subscription " +
          "will not work until a WebSocket provider connects."
      )
    }
  }

  /**
   * Subscribe to pending transactions that have been resolved to a full
   * transaction object; uses optimized paths when the provider supports it,
   * otherwise subscribes to pending transaction hashes and manually resolves
   * them with a transaction lookup.
   */
  async subscribeFullPendingTransactions(
    { address, network }: AddressOnNetwork,
    handler: (pendingTransaction: AnyEVMTransaction) => void
  ): Promise<void> {
    if (this.chainID !== network.chainID) {
      logger.error(
        `Tried to subscribe to pending transactions for chain id ` +
          `${network.chainID} but provider was on ` +
          `${this.chainID}`
      )
      return
    }

    const alchemySubscription =
      await this.alchemySubscribeFullPendingTransactions(
        { address, network },
        handler
      )

    if (alchemySubscription === "unsupported") {
      // Fall back on a standard pending transaction subscription if the
      // Alchemy version is unsupported.
      this.on("pending", async (transactionHash: unknown) => {
        try {
          if (typeof transactionHash === "string") {
            const transaction = transactionFromEthersTransaction(
              await this.getTransaction(transactionHash),
              network
            )

            handler(transaction)
          }
        } catch (innerError) {
          logger.error(
            `Error handling incoming pending transaction hash: ${transactionHash}`,
            innerError
          )
        }
      })
    }
  }

  /**
   * Behaves the same as the `JsonRpcProvider` `on` method, but also trakcs the
   * event subscription so that an underlying provider failure will not prevent
   * it from firing.
   */
  override on(eventName: EventType, listener: Listener): this {
    this.eventSubscriptions.push({
      eventName,
      listener,
      once: false,
    })

    this.currentProvider.on(eventName, listener)

    return this
  }

  /**
   * Behaves the same as the `JsonRpcProvider` `once` method, but also trakcs
   * the event subscription so that an underlying provider failure will not
   * prevent it from firing.
   */
  override once(eventName: EventType, listener: Listener): this {
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
  override off(eventName: EventType, listenerToRemove?: Listener): this {
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
   * Handles any cleanup needed for the current provider.
   *
   * Useful especially for when a non-WebSocket provider is tracking events,
   * which are done via polling. In these cases, if the provider became
   * available again, even if it was no longer the current provider, it would
   * start calling its event handlers again; disconnecting in this way
   * unsubscribes all those event handlers so they can be attached to the new
   * current provider.
   */
  private disconnectCurrentProvider() {
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
    this.disconnectCurrentProvider()
    if (this.currentProviderIndex >= this.providerCreators.length) {
      this.currentProviderIndex = 0
    }

    logger.debug(
      "Reconnecting provider at index",
      this.currentProviderIndex,
      "..."
    )

    this.currentProvider = this.providerCreators[this.currentProviderIndex]()
    await this.resubscribe(this.currentProvider)

    // TODO After a longer backoff, attempt to reset the current provider to 0.
  }

  /**
   * Resubscribes existing WebSocket subscriptions (if the current provider is
   * a `WebSocketProvider`) and regular Ethers subscriptions (for all
   * providers).
   * @param provider The provider to use to resubscribe
   * @returns A boolean indicating if websocket subscription was successful or not
   */
  private async resubscribe(provider: JsonRpcProvider): Promise<boolean> {
    logger.debug("Resubscribing subscriptions...")

    if (
      isClosedOrClosingWebSocketProvider(provider) ||
      isConnectingWebSocketProvider(provider)
    ) {
      return false
    }

    if (!provider.network) {
      return false
    }

    if (provider instanceof WebSocketProvider) {
      const websocketProvider = provider as WebSocketProvider

      // Chain promises to serially resubscribe.
      //
      // TODO If anything fails along the way, it should yield the same kind of
      // TODO backoff as a regular `send`.
      await this.subscriptions.reduce(
        (previousPromise, { tag, param, processFunc }) =>
          previousPromise.then(() =>
            waitAnd(backedOffMs(), () =>
              // Direct subscriptions are internal, but we want to be able to
              // restore them.
              // eslint-disable-next-line no-underscore-dangle
              websocketProvider._subscribe(tag, param, processFunc)
            )
          ),
        Promise.resolve()
      )
    }

    this.eventSubscriptions.forEach(({ eventName, listener, once }) => {
      if (once) {
        provider.once(eventName, listener)
      } else {
        provider.on(eventName, listener)
      }
    })

    logger.debug("Subscriptions resubscribed...")
    return true
  }

  private async attemptToReconnectToAlchemyProvider(): Promise<void> {
    if (
      this.alchemyProvider &&
      this.alchemyProviderCreator &&
      isClosedOrClosingWebSocketProvider(this.alchemyProvider)
    ) {
      // Always reconnect without resubscribing - since subscriptions
      // should live on the currentProvider
      this.alchemyProvider = this.alchemyProviderCreator()
    }
  }

  private async attemptToReconnectToPrimaryProvider(): Promise<unknown> {
    if (this.currentProviderIndex === 0) {
      // If we are already connected to the primary provider - don't resubscribe
      return null
    }
    const primaryProvider = this.providerCreators[0]()
    // We need to wait before attempting to resubscribe of the primaryProvider's
    // websocket connection will almost always still be in a CONNECTING state when
    // resubscribing.
    return waitAnd(WAIT_BEFORE_SUBSCRIBING, async (): Promise<unknown> => {
      const subscriptionsSuccessful = await this.resubscribe(primaryProvider)
      if (!subscriptionsSuccessful) {
        return
      }
      // Cleanup the subscriptions on the backup provider.
      await this.disconnectCurrentProvider()
      // only set if subscriptions are successful
      this.currentProvider = primaryProvider
      this.currentProviderIndex = 0
    })
  }

  /**
   * @param messageId The unique identifier of a given message
   * @returns number of miliseconds to backoff
   */
  private backoffFor(messageId: symbol): number {
    this.messagesToSend[messageId].backoffCount += 1
    this.conditionallyIncrementCurrentProviderIndex(messageId)
    return backedOffMs()
  }

  /**
   * Increments the currentProviderIndex and resets a given messages backOffCount
   * if it is being sent on a new provider.
   *
   * @param messageId The unique identifier of a given message
   */
  private conditionallyIncrementCurrentProviderIndex(messageId: symbol) {
    const { providerIndex } = this.messagesToSend[messageId]

    if (providerIndex !== this.currentProviderIndex) {
      this.messagesToSend[messageId].backoffCount = 0
      this.messagesToSend[messageId].providerIndex = this.currentProviderIndex
    }
  }

  /**
   * @param messageId The unique identifier of a given message
   * @returns true if a message should be sent on the next provider, false otherwise
   */
  private shouldSendMessageOnNextProvider(messageId: symbol): boolean {
    const { backoffCount } = this.messagesToSend[messageId]
    if (backoffCount && backoffCount >= MAX_RETRIES_PER_PROVIDER) {
      return true
    }
    return false
  }

  /**
   * Attempts to subscribe to pending transactions in an Alchemy-specific
   * way. Returns `subscribed` if the subscription succeeded, or `unsupported`
   * if the underlying provider did not support Alchemy-specific subscriptions.
   */
  private async alchemySubscribeFullPendingTransactions(
    { address, network }: AddressOnNetwork,
    handler: (pendingTransaction: AnyEVMTransaction) => void
  ): Promise<"subscribed" | "unsupported"> {
    try {
      await this.subscribe(
        "filteredNewFullPendingTransactionsSubscriptionID",
        [
          "alchemy_pendingTransactions",
          { fromAddress: address, toAddress: address },
        ],
        async (result: unknown) => {
          // TODO use proper provider string
          // handle incoming transactions for an account
          try {
            const transaction = transactionFromAlchemyWebsocketTransaction(
              result,
              network
            )

            handler(transaction)
          } catch (error) {
            logger.error(
              `Error handling incoming pending transaction: ${result}`,
              error
            )
          }
        }
      )

      return "subscribed"
    } catch (error) {
      const errorString = String(error)
      if (errorString.match(/is unsupported on/i)) {
        return "unsupported"
      }

      throw error
    }
  }
}

export function makeSerialFallbackProvider(
  chainID: string,
  rpcUrls: string[]
): SerialFallbackProvider {
  const alchemyProviderCreators = ALCHEMY_SUPPORTED_CHAIN_IDS.has(chainID)
    ? [
        {
          type: "alchemy" as const,
          creator: () =>
            new AlchemyProvider(getNetwork(Number(chainID)), ALCHEMY_KEY),
        },
        {
          type: "alchemy" as const,
          creator: () =>
            new AlchemyWebSocketProvider(
              getNetwork(Number(chainID)),
              ALCHEMY_KEY
            ),
        },
      ]
    : []

  const genericProviders = rpcUrls.map((rpcUrl) => ({
    type: "generic" as const,
    creator: () => {
      const url = new URL(rpcUrl)
      if (/^wss?/.test(url.protocol)) {
        return new WebSocketProvider(rpcUrl)
      }

      return new JsonRpcProvider(rpcUrl)
    },
  }))

  return new SerialFallbackProvider(chainID, [
    // Prefer alchemy as the primary provider when available
    ...genericProviders,
    ...alchemyProviderCreators,
  ])
}
