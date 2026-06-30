import {
  EventType,
  JsonRpcProvider,
  Listener,
  WebSocketProvider,
} from "@ethersproject/providers"
import { utils } from "ethers"
import {
  SECOND,
  FLASHBOTS_RPC_URL,
  ARBITRUM_ONE,
  OPTIMISM,
  FORK,
  ARBITRUM_SEPOLIA,
  BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS,
} from "../../constants"
import logger from "../../lib/logger"
import { AnyEVMTransaction } from "../../networks"
import { AddressOnNetwork } from "../../accounts"
import { transactionFromEthersTransaction } from "./utils"
import {
  BOAR_RPC_URLS,
  transactionFromBoarWebsocketTransaction,
} from "../../lib/boar"
import { FeatureFlags, isEnabled } from "../../features"
import { RpcConfig } from "./db"
import TahoBoarProvider from "./taho-boar-provider"
import { getErrorType } from "./errors"
import TahoRPCProvider from "./taho-rpc-provider"
import {
  recordCircuitBreakerTransition,
  recordReconnectAttempt,
  recordReconnectFailed,
  recordReconnectSucceeded,
  recordRequestFailed,
  recordRequestSent,
  recordRequestSucceeded,
  recordSingleFlightCoalesce,
  RequestFailureCategory,
} from "../../lib/perf-metrics"
import { CircuitBreaker } from "./circuit-breaker"

export type ProviderCreator = {
  type: "boar" | "custom" | "generic"
  supportedMethods?: string[]
  creator: () => JsonRpcProvider
}

const isWebSocketProvider = (
  provider: JsonRpcProvider,
): provider is WebSocketProvider => provider instanceof WebSocketProvider

/**
 * Method list, to describe which rpc method calls on which networks should
 * prefer the Boar provider over the generic ones.
 *
 * The method names can be full or the starting parts of the method name.
 * This allows us to use "namespaces" for providers eg `alchemy_...` or `qn_...`
 *
 * The structure is network specific with an extra `everyChain` option.
 * The methods in this array will be directed towards Boar on every network.
 */
export const BOAR_RPC_METHOD_PROVIDER_ROUTING = {
  everyChain: [
    "alchemy_", // alchemy specific api calls start with this
    "eth_sendRawTransaction", // broadcast should always go to boar
    "eth_subscribe", // generic http providers do not support this, but dapps need this
    "eth_estimateGas", // just want to be safe, when setting up a transaction
    "eth_getLogs", // to avoid eth_getLogs block range limitations
  ],
  [OPTIMISM.chainID]: [
    "eth_call", // this is causing issues on optimism with ankr and is used heavily by uniswap
  ],
  [ARBITRUM_ONE.chainID]: [
    "eth_call", // this is causing issues on arbitrum with ankr and is used heavily by uniswap
  ],
} as const
/**
 * Methods that must never be coalesced into a shared in-flight request.
 *
 * Subscription lifecycle methods produce per-call state (subscription ids)
 * that cannot be shared between callers. Signing and broadcasting methods
 * either have side effects or must produce an independent response per call
 * to support user-visible confirmation flows.
 */
const NON_COALESCEABLE_METHODS = new Set([
  "eth_subscribe",
  "eth_unsubscribe",
  "eth_sendTransaction",
  "eth_sendRawTransaction",
  "eth_sign",
  "eth_signTransaction",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "personal_sign",
])

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
// How often to check and clean stale cache entries
const CACHE_CLEANUP_INTERVAL = 10 * SECOND
// How long to wait for a provider to respond before falling back to the next provider.
const PROVIDER_REQUEST_TIMEOUT = 5 * SECOND

/**
 * Wait the given number of ms, then run the provided function. Returns a
 * promise that will resolve after the delay has elapsed and the passed
 * function has executed, with the result of the passed function.
 */
function waitAnd<T, E extends Promise<T>>(
  waitMs: number,
  fn: () => E,
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
 * Generates a unique cache key given a method and parameters. This key is
 * not safe to deserialize and is designed explicitly for Ethereum JSON-RPC
 * requests.
 */
function getRPCCacheKey(method: string, params: unknown) {
  // Transform and sort values so two calls with the same JSON payload
  // return the same key
  return `${method}::${JSON.stringify(params, (_k, val) => {
    if (val === null) {
      return null
    }

    if (typeof val === "bigint") {
      return `${val}n`
    }

    if (typeof val === "string") {
      return val.toLowerCase()
    }

    if (typeof val === "object" && !Array.isArray(val)) {
      const keys = Object.keys(val)
      keys.sort()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return keys.reduce<any>((acc, key) => {
        acc[key] = val[key]
        return acc
      }, {})
    }

    return val
  })}`
}

type CacheEntry = {
  result: unknown
  updatedAt: number
}

/**
 * Return a jittered amount of ms to backoff bounded between 400 and 800 ms
 */
function backedOffMs(): number {
  return BASE_BACKOFF_MS + 400 * Math.random()
}

/**
 * Normalize an arbitrary error thrown during RPC routing into one of the
 * categories tracked by the perf metrics collector. Unrecognized errors map
 * to `"unknown-error"`; this stays in sync with {@link getErrorType}.
 */
function categorizeError(
  error: unknown,
  method: string,
): RequestFailureCategory {
  return getErrorType(String(error), method)
}

/**
 * Extracts the HTTP status code from an error object, if present.
 * Ethers errors may store the status code in different properties depending
 * on the error type.
 */
function getHttpStatusCode(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    // Check common properties where status code might be stored
    if ("status" in error && typeof error.status === "number") {
      return error.status
    }
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return error.statusCode
    }
    // ethers might store it in response
    if (
      "response" in error &&
      error.response &&
      typeof error.response === "object"
    ) {
      const response = error.response as Record<string, unknown>
      if (typeof response.status === "number") {
        return response.status
      }
    }
  }
  return undefined
}

/**
 * Returns true if the given provider is using a WebSocket AND the WebSocket is
 * either closing or already closed. Ethers does not provide direct access to
 * this information, nor does it attempt to reconnect in these cases.
 */
function isClosedOrClosingWebSocketProvider(
  provider: JsonRpcProvider,
): boolean {
  if (isWebSocketProvider(provider)) {
    const webSocket = provider.websocket

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
  if (isWebSocketProvider(provider)) {
    const webSocket = provider.websocket
    return webSocket.readyState === WebSocket.CONNECTING
  }

  return false
}

/**
 * Return the decision whether a given RPC call should be routed to the Boar provider
 * or the generic provider.
 *
 * Checking whether Boar is supported is a non concern for this function!
 *
 * @param chainID string chainID to handle chain specific routings
 * @param method the current RPC method
 * @returns true | false whether the method on a given network should be routed to Boar or can be sent over the generic provider
 */
function boarOrDefaultProvider(chainID: string, method: string): boolean {
  if (
    method.startsWith("alchemy_") &&
    BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS.has(chainID)
  ) {
    return false
  }
  return (
    BOAR_RPC_METHOD_PROVIDER_ROUTING.everyChain.some((m: string) =>
      method.startsWith(m),
    ) ||
    (BOAR_RPC_METHOD_PROVIDER_ROUTING[Number(chainID)] ?? []).some(
      (m: string) => method.startsWith(m),
    )
  )
}

function customOrDefaultProvider(
  method: string,
  supportedMethods: string[] = [],
): boolean {
  // Boar's methods have to go through Boar
  if (method.startsWith("alchemy_")) {
    return false
  }

  // If there are no supported methods we can assume we want to route everything through this provider
  if (!supportedMethods.length) {
    return true
  }

  return supportedMethods.some((m: string) => method.startsWith(m))
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
  private providerCreators: (() => JsonRpcProvider)[]

  // The currently-used provider, produced by the provider-creator at
  // currentProviderIndex.
  private currentProvider: JsonRpcProvider

  private boarProvider: JsonRpcProvider | undefined

  private customProvider: JsonRpcProvider | undefined

  private customProviderSupportedMethods: string[] = []

  private cachedProvidersByIndex: Record<string, JsonRpcProvider | undefined> =
    {}

  #sendCache = new Map<string, CacheEntry>()

  /**
   * Promises for RPC requests that are currently in flight, keyed by a
   * canonical method+params signature. New callers issuing the same request
   * while one is still outstanding receive the in-flight promise rather than
   * initiating a second provider call.
   *
   * Only methods that are safe to share (not signing, not broadcasting, not
   * subscription lifecycle) are stored here; see {@link NON_COALESCEABLE_METHODS}.
   */
  #inFlightRequests = new Map<string, Promise<unknown>>()

  /**
   * One circuit breaker per provider index, created lazily. Protects each
   * provider from being retried into the ground while it is known to be
   * failing, and suppresses the periodic primary-recovery attempt while the
   * primary breaker is open.
   */
  #circuitBreakers = new Map<number, CircuitBreaker>()

  #cacheSettings = new Map<string, number>(
    Object.entries({
      // TEMPORARY cache for latest account balances to reduce number of rpc calls
      // This is intended as a temporary fix to the burst of account enrichment that
      // happens when the extension is first loaded up as a result of activity emission
      // inside of chainService.connectChainService
      eth_getBalance: 1 * SECOND,

      // TEMPORARY cache for if an address has code to reduce number of rpc calls
      // This is intended as a temporary fix to the burst of account enrichment that
      // happens when the extension is first loaded up as a result of activity emission
      // inside of chainService.connectChainService
      // This cache will get reset every time the service worker reactivates and the property of having code update is quite rare.

      eth_getCode: 600 * SECOND,
      eth_chainId: 3600 * SECOND,
    }),
  )

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

  private boarProviderCreator: (() => JsonRpcProvider) | undefined

  supportsBoar = false

  private customProviderCreator: (() => JsonRpcProvider) | undefined

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

  // Information on WebSocket-style subscriptions. Tracked here so as to
  // restore them in case of WebSocket disconnects.
  private subscriptions: {
    tag: string
    param: unknown[]
    processFunc: (_: unknown) => void
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
    providerCreators: Array<ProviderCreator>,
  ) {
    const customProviderCreator = providerCreators.find(
      (creator) => creator.type === "custom",
    )

    const boarProviderCreator = providerCreators.find(
      (creator) => creator.type === "boar",
    )

    const [firstProviderCreator, ...remainingProviderCreators] =
      providerCreators.flatMap((pc) => (pc.type === "custom" ? [] : pc.creator))

    const firstProvider = firstProviderCreator()

    super(firstProvider.connection, firstProvider.network)

    this.currentProvider = firstProvider
    this.cachedProvidersByIndex[0] = firstProvider

    if (boarProviderCreator) {
      this.supportsBoar = true
      this.boarProviderCreator = boarProviderCreator.creator
      this.boarProvider = this.boarProviderCreator()
    }

    if (customProviderCreator) {
      this.addCustomProvider(customProviderCreator)
    }

    setInterval(() => {
      this.attemptToReconnectToPrimaryProvider()
      this.attemptToReconnectToBoarProvider()
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
      return cachedResult.result
    }
    const existingProviderIndex = this.currentProviderIndex
    try {
      if (isClosedOrClosingWebSocketProvider(this.currentProvider)) {
        // Detect disconnected WebSocket and immediately throw.
        throw new Error("WebSocket is already in CLOSING")
      }

      if (isConnectingWebSocketProvider(this.currentProvider)) {
        // If the websocket is still connecting, wait and try to send again.
        return await waitAnd(WAIT_BEFORE_SEND_AGAIN, async () =>
          this.routeRpcCall(messageId),
        )
      }

      if (
        this.customProvider &&
        customOrDefaultProvider(method, this.customProviderSupportedMethods)
      ) {
        const result = await this.customProvider.send(method, params)
        delete this.messagesToSend[messageId]
        return result
      }

      if (
        // Force some methods to be handled by Boar if we're on a Boar supported chain
        this.boarProvider &&
        boarOrDefaultProvider(this.cachedChainId, method)
      ) {
        const result = await this.boarProvider.send(method, params)
        delete this.messagesToSend[messageId]
        return result
      }

      const breaker = this.breakerFor(this.currentProviderIndex)
      if (!breaker.canRequest()) {
        // The current provider is known-bad. Skip straight to the existing
        // fallback path so we do not issue a request guaranteed to fail and
        // do not pile onto whatever outage it is sitting out.
        if (this.currentProviderIndex + 1 < this.providerCreators.length) {
          return await this.attemptToSendMessageOnNewProvider(messageId)
        }
        // No more providers to try this cycle; reset and fail as we would
        // on an exhausted chain.
        this.currentProviderIndex = 0
        this.reconnectProvider()
        delete this.messagesToSend[messageId]
        throw new Error("NETWORK_ERROR: circuit open and no fallback available")
      }

      let result: unknown
      try {
        result = await this.currentProvider.send(method, params)
      } catch (error) {
        // Any thrown error here represents the breaker's view of a failure;
        // feeding it into the breaker keeps state machines aligned with the
        // behavior observed by the existing error-classification path below.
        breaker.recordFailure()
        throw error
      }
      breaker.recordSuccess()
      // If https://github.com/tc39/proposal-decorators ever gets out of Stage 3
      // cleaning up the messageToSend object seems like a great job for a decorator
      delete this.messagesToSend[messageId]
      return result
    } catch (error) {
      // Awful, but what can ya do.

      const stringifiedError = String(error)

      const errorType = getErrorType(stringifiedError, method)

      if (
        errorType === "batch-limit-exceeded" &&
        this.currentProvider instanceof TahoRPCProvider
      ) {
        const requestBatch = this.currentProvider.getBatchFromError(error)

        // Note that every other request in the batch will set the length to
        // the same value
        if (
          requestBatch.length <=
          this.currentProvider.getOptions().maxBatchLength
        ) {
          const newMaxBatchLen = Math.max(
            Math.floor(requestBatch.length / 2),
            1,
          )

          this.currentProvider.setOptions({
            maxBatchLength: newMaxBatchLen,
          })

          logger.debug(
            "Setting a max batch size of",
            newMaxBatchLen,
            "for rpc",
            this.currentProvider.connection.url,
          )
        }
        // Retry with a new limit on batch length
        return waitAnd(500, () => this.routeRpcCall(messageId))
      }

      if (
        errorType === "network-error" ||
        errorType === "rate-limit-error" ||
        errorType === "response-error"
      ) {
        // If a new provider is already in the process of being tried, go ahead
        // and fire off into the new provider.
        if (this.currentProviderIndex !== existingProviderIndex) {
          logger.debug(
            "Retrying on newly connected provider on chain",
            this.chainID,
            ": ",
            method,
            params,
          )
          return await this.routeRpcCall(messageId)
        }

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
      } else if (errorType === "invalid-response-error") {
        // Don't retry on 4xx client errors - these indicate the request itself
        // is invalid and retrying won't help
        const statusCode = getHttpStatusCode(error)
        if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
          logger.debug(
            "Not retrying invalid-response-error with 4xx status",
            statusCode,
            "on chain",
            this.chainID,
            "for",
            method,
          )
          delete this.messagesToSend[messageId]
          throw error
        }

        // Check if we're already retrying this on a different provider
        if (
          this.hasExceededRetryLimit(messageId) &&
          this.currentProviderIndex !==
            // Initial provider index this message was first send on
            this.messagesToSend[messageId].providerIndex
        ) {
          throw error
        }

        if (
          // If the current provider is the one we tried with initially.
          this.currentProviderIndex === existingProviderIndex &&
          // If there is another provider to try and we have exceeded the
          // number of retries try to send the message on that provider
          this.currentProviderIndex + 1 < this.providerCreators.length &&
          this.hasExceededRetryLimit(messageId)
        ) {
          return await this.attemptToSendMessageOnNewProvider(messageId)
        }

        const backoff = this.backoffFor(messageId)
        logger.debug(
          "Backing off for",
          backoff,
          "on chain",
          this.chainID,
          "and retrying: ",
          method,
          params,
        )

        return await waitAnd(backoff, async () => {
          if (isClosedOrClosingWebSocketProvider(this.currentProvider)) {
            await this.reconnectProvider()
          }

          logger.debug("Retrying", "on chain", this.chainID, method, params)
          return this.routeRpcCall(messageId)
        })
      }

      logger.debug(
        "Skipping fallback for unidentified error",
        error,
        "for provider",
        this.currentProvider,
        "on chain",
        this.chainID,
      )

      delete this.messagesToSend[messageId]
      throw error
    }
  }

  /**
   * Returns the circuit breaker for a given provider index, creating it the
   * first time it is requested. Each breaker wires its transitions into the
   * perf metrics collector so analytics can track how often providers go down
   * and how quickly they recover.
   */
  private breakerFor(providerIndex: number): CircuitBreaker {
    let breaker = this.#circuitBreakers.get(providerIndex)
    if (!breaker) {
      breaker = new CircuitBreaker({}, (next) =>
        recordCircuitBreakerTransition(this.chainID, providerIndex, next),
      )
      this.#circuitBreakers.set(providerIndex, breaker)
    }
    return breaker
  }

  addCustomProvider(customProviderCreator: ProviderCreator): void {
    this.customProviderSupportedMethods =
      customProviderCreator.supportedMethods ?? []
    this.customProviderCreator = customProviderCreator.creator
    this.customProvider = this.customProviderCreator()
  }

  removeCustomProvider(): void {
    this.customProviderSupportedMethods = []
    this.customProviderCreator = undefined
    this.customProvider = undefined
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
    { method, params }: { method: string; params: unknown },
  ): void {
    if (this.#cacheSettings.has(method)) {
      this.#sendCache.set(getRPCCacheKey(method, params), {
        updatedAt: Date.now(),
        result,
      })
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
    params: unknown,
  ): CacheEntry | undefined {
    const ttl = this.#cacheSettings.get(method)

    if (typeof ttl !== "undefined") {
      const entry = this.#sendCache.get(getRPCCacheKey(method, params))

      if (entry && ttl + entry.updatedAt > Date.now()) {
        return entry
      }
    }

    return undefined
  }

  /**
   * Cache cleanup to mitigate unbounded growth of our hasCode and balance caches.
   */
  cleanupStaleCacheEntries(): void {
    let counter = 0

    this.#sendCache.forEach((value, key) => {
      const method = key.split("::")[0]
      const ttl = this.#cacheSettings.get(method)

      if (ttl && value.updatedAt + ttl < Date.now()) {
        this.#sendCache.delete(key)
        counter += 1
      }
    })

    if (counter > 0) {
      logger.info(
        `Cleaning up ${counter} cache entries on RPC for chain id: ${this.network.chainId}`,
      )
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
    messageId: symbol,
  ): Promise<unknown> {
    this.disconnectCurrentProvider()
    this.currentProviderIndex += 1
    // Try again with the next provider.
    await this.reconnectProvider()

    const isBoarFallback =
      this.boarProvider && this.currentProvider === this.boarProvider

    return this.routeRpcCall(messageId).finally(() => {
      // If every other provider failed and we're on the Boar provider,
      // reconnect to the first provider once we've handled this request
      // as we should limit relying on Boar as a fallback
      if (isBoarFallback && this.currentProviderIndex !== 0) {
        this.currentProviderIndex = 0
        this.reconnectProvider()
      }
    })
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

    // Coalesce concurrent identical requests into a single in-flight call.
    // This is safe for idempotent reads and explicitly skipped for subscription
    // lifecycle and side-effecting (signing / broadcast) methods so those always
    // produce an independent provider call per invocation.
    if (!NON_COALESCEABLE_METHODS.has(method)) {
      const key = getRPCCacheKey(method, params)
      const existing = this.#inFlightRequests.get(key)
      if (existing !== undefined) {
        recordSingleFlightCoalesce(this.chainID, this.currentProviderIndex)
        return existing
      }

      const flight = this.dispatchRequest(method, params)
      this.#inFlightRequests.set(key, flight)
      // Clear the slot on both success and failure so the next caller makes
      // a fresh request. Use `then(cleanup, cleanup)` rather than `finally`
      // so a rejection does not escape as an unhandled promise on the
      // cleanup chain; callers still observe the rejection on `flight`.
      const cleanup = () => {
        this.#inFlightRequests.delete(key)
      }
      flight.then(cleanup, cleanup)
      return flight
    }

    return this.dispatchRequest(method, params)
  }

  /**
   * Executes a single logical RPC request end-to-end, including metrics and
   * result caching. Callers must never invoke this directly for coalesceable
   * methods; {@link send} is responsible for single-flight deduplication
   * before handing off here.
   */
  private async dispatchRequest(
    method: string,
    params: unknown[],
  ): Promise<unknown> {
    // Generate a unique symbol to track the message and store message information
    const id = Symbol(method)
    this.messagesToSend[id] = {
      method,
      params,
      backoffCount: 0,
      providerIndex: this.currentProviderIndex,
    }

    const startingProviderIndex = this.currentProviderIndex
    recordRequestSent(this.chainID, startingProviderIndex)
    const startTime = Date.now()

    try {
      // Start routing message down our waterfall of rpc providers
      const result = await this.routeRpcCall(id)

      // Record against the provider that actually served the request, which
      // may differ from the starting index if we failed over.
      recordRequestSucceeded(
        this.chainID,
        this.currentProviderIndex,
        Date.now() - startTime,
      )

      // Cache results for method/param combinations that are frequently called subsequently
      this.conditionallyCacheResult(result, { method, params })

      return result
    } catch (error) {
      recordRequestFailed(
        this.chainID,
        this.currentProviderIndex,
        categorizeError(error, method),
      )
      throw error
    }
  }

  /**
   * Exposes direct WebSocket subscription by JSON-RPC method. Takes immediate
   * effect if the current underlying provider is a WebSocketProvider. If it is
   * not, queues the subscription up for when a WebSocketProvider can connect.
   */
  async subscribe(
    tag: string,
    param: Array<unknown>,
    processFunc: (result: unknown) => void,
  ): Promise<void> {
    const subscription = { tag, param, processFunc }

    if (isWebSocketProvider(this.currentProvider)) {
      // eslint-disable-next-line no-underscore-dangle
      await this.currentProvider._subscribe(tag, param, processFunc)
      this.subscriptions.push(subscription)
    } else {
      logger.warn(
        "Current provider ",
        this.currentProvider,
        " for ",
        this.network,
        "is not a WebSocket provider; subscription " +
          "will not work until a WebSocket provider connects.",
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
    handler: (pendingTransaction: AnyEVMTransaction) => void,
  ): Promise<void> {
    if (
      this.chainID !== network.chainID &&
      !isEnabled(FeatureFlags.USE_MAINNET_FORK)
    ) {
      logger.error(
        "Tried to subscribe to pending transactions for chain id " +
          `${network.chainID} but provider was on ` +
          `${this.chainID}`,
      )
      return
    }
    const boarSubscription = await this.boarSubscribeFullPendingTransactions(
      { address, network },
      handler,
    )

    if (boarSubscription === "unsupported") {
      // Fall back on a standard pending transaction subscription if the
      // Boar version is unsupported.
      this.on("pending", async (transactionHash: unknown) => {
        try {
          if (typeof transactionHash === "string") {
            const transaction = transactionFromEthersTransaction(
              await this.getTransaction(transactionHash),
              network,
            )

            handler(transaction)
          }
        } catch (innerError) {
          logger.error(
            "Error handling incoming pending transaction hash:",
            transactionHash,
            "on chain",
            this.chainID,
            ":",
            innerError,
          )
        }
      })
    }
  }

  /**
   * Behaves the same as the `JsonRpcProvider` `on` method, but also tracks the
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
   * Behaves the same as the `JsonRpcProvider` `once` method, but also tracks
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
      },
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
      isWebSocketProvider(this.currentProvider),
      "on chain",
      this.chainID,
      ".",
    )
    if (isWebSocketProvider(this.currentProvider)) {
      this.currentProvider.destroy()
    } else {
      // For non-WebSocket providers, kill all subscriptions so the listeners
      // won't fire; the next provider will pick them up. We could lose events
      // in between, but if we're considering the current provider dead, let's
      // assume we would lose them anyway.
      this.eventSubscriptions.forEach(({ eventName }) =>
        this.removeAllListeners(eventName),
      )
    }
  }

  /**
   * Wraps an Ethers listener function meant to only be invoked once with
   * cleanup to ensure it won't be resubscribed in case of a provider switch.
   */
  private listenerWithCleanup(
    eventName: EventType,
    listenerToWrap: Listener,
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
            once !== true,
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

    recordReconnectAttempt(this.chainID, this.currentProviderIndex)

    logger.debug(
      "Reconnecting provider at index",
      this.currentProviderIndex,
      "on chain",
      this.chainID,
      "...",
    )

    const cachedProvider =
      this.cachedProvidersByIndex[this.currentProviderIndex] ??
      this.providerCreators[this.currentProviderIndex]()

    this.cachedProvidersByIndex[this.currentProviderIndex] = cachedProvider

    this.currentProvider = cachedProvider

    const resubscribed = await this.resubscribe(this.currentProvider)
    if (resubscribed) {
      recordReconnectSucceeded(this.chainID, this.currentProviderIndex)
    } else {
      recordReconnectFailed(this.chainID, this.currentProviderIndex)
    }

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
    logger.debug("Resubscribing subscriptions", "on chain", this.chainID, "...")

    if (
      isClosedOrClosingWebSocketProvider(provider) ||
      isConnectingWebSocketProvider(provider)
    ) {
      return false
    }

    if (!provider.network) {
      return false
    }

    if (isWebSocketProvider(provider)) {
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
              provider._subscribe(tag, param, processFunc),
            ),
          ),
        Promise.resolve(),
      )
    }

    this.eventSubscriptions.forEach(({ eventName, listener, once }) => {
      if (once) {
        provider.once(eventName, listener)
      } else {
        provider.on(eventName, listener)
      }
    })

    logger.debug("Subscriptions resubscribed", "on chain", this.chainID, "...")
    return true
  }

  private async attemptToReconnectToBoarProvider(): Promise<void> {
    if (
      this.boarProvider &&
      this.boarProviderCreator &&
      isClosedOrClosingWebSocketProvider(this.boarProvider)
    ) {
      // Always reconnect without resubscribing - since subscriptions
      // should live on the currentProvider
      this.boarProvider = this.boarProviderCreator()
    }
  }

  private async attemptToReconnectToPrimaryProvider(): Promise<unknown> {
    if (this.currentProviderIndex === 0) {
      // If we are already connected to the primary provider - don't resubscribe
      return null
    }
    if (!this.breakerFor(0).canRequest()) {
      // Primary is still in cooldown; skip this cycle so the reconnect loop
      // does not itself become a source of request pressure on a down endpoint.
      return null
    }
    recordReconnectAttempt(this.chainID, 0)
    const primaryProvider = this.providerCreators[0]()
    // We need to wait before attempting to resubscribe of the primaryProvider's
    // websocket connection will almost always still be in a CONNECTING state when
    // resubscribing.
    return waitAnd(WAIT_BEFORE_SUBSCRIBING, async (): Promise<unknown> => {
      const subscriptionsSuccessful = await this.resubscribe(primaryProvider)
      if (!subscriptionsSuccessful) {
        recordReconnectFailed(this.chainID, 0)
        return
      }
      // Cleanup the subscriptions on the backup provider.
      await this.disconnectCurrentProvider()
      // only set if subscriptions are successful
      this.currentProvider = primaryProvider
      this.currentProviderIndex = 0
      recordReconnectSucceeded(this.chainID, 0)
    })
  }

  /**
   * @param messageId The unique identifier of a given message
   * @returns number of milliseconds to backoff
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
  private hasExceededRetryLimit(messageId: symbol): boolean {
    const { backoffCount } = this.messagesToSend[messageId]
    if (backoffCount && backoffCount >= MAX_RETRIES_PER_PROVIDER) {
      return true
    }
    return false
  }

  /**
   * Attempts to subscribe to pending transactions in a Boar-specific
   * way. Returns `subscribed` if the subscription succeeded, or `unsupported`
   * if the underlying provider did not support Boar-specific subscriptions.
   */
  private async boarSubscribeFullPendingTransactions(
    { address, network }: AddressOnNetwork,
    handler: (pendingTransaction: AnyEVMTransaction) => void,
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
            const transaction = transactionFromBoarWebsocketTransaction(
              result,
              network,
            )

            handler(transaction)
          } catch (error) {
            logger.error(
              `Error handling incoming pending transaction: ${result}`,
              "on chain",
              this.chainID,
              error,
            )
          }
        },
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

function getProviderCreator(rpcUrl: string): JsonRpcProvider {
  const url = new URL(rpcUrl)
  if (/^wss?/.test(url.protocol)) {
    return new WebSocketProvider(rpcUrl)
  }
  return new TahoRPCProvider({
    url: rpcUrl,
    throttleLimit: 1,
    timeout: PROVIDER_REQUEST_TIMEOUT,
    fetchOptions: {
      credentials: "omit",
    },
  })
}

export function makeFlashbotsProviderCreator(): ProviderCreator {
  return {
    type: "custom",
    supportedMethods: ["eth_sendRawTransaction"],
    creator: () =>
      new TahoRPCProvider(FLASHBOTS_RPC_URL, undefined, { maxBatchLength: 1 }),
  }
}

export function makeSerialFallbackProvider(
  chainID: string,
  rpcUrls: string[],
  customRpc?: RpcConfig,
): SerialFallbackProvider {
  if (isEnabled(FeatureFlags.USE_MAINNET_FORK)) {
    return new SerialFallbackProvider(FORK.chainID, [
      {
        type: "generic" as const,
        creator: () => new TahoRPCProvider(process.env.MAINNET_FORK_URL),
      },
    ])
  }

  if (
    chainID === ARBITRUM_SEPOLIA.chainID &&
    process.env.ARBITRUM_FORK_RPC !== undefined &&
    process.env.ARBITRUM_FORK_RPC.trim() !== "" &&
    process.env.SUPPORT_THE_ISLAND_ON_TENDERLY === "true"
  ) {
    // eslint-disable-next-line no-console
    console.log(
      "%c🦴 Using Tenderly fork as Arbitrum Sepolia provider",
      "background: #071111; color: #fff; font-weight: 900;",
    )
    return new SerialFallbackProvider(ARBITRUM_SEPOLIA.chainID, [
      {
        type: "generic" as const,
        creator: () => new TahoRPCProvider(process.env.ARBITRUM_FORK_RPC),
      },
    ])
  }

  const boarRpcUrl = BOAR_RPC_URLS[chainID]
  const boarProviderCreators: ProviderCreator[] = boarRpcUrl
    ? [
        {
          type: "boar" as const,
          creator: () => new TahoBoarProvider(boarRpcUrl),
        },
      ]
    : []

  const customProviderCreator: ProviderCreator[] = customRpc
    ? [
        {
          type: "custom" as const,
          supportedMethods: customRpc.supportedMethods ?? [],
          creator: () => getProviderCreator(customRpc.rpcUrls[0]),
        },
      ]
    : []

  const genericProviders: ProviderCreator[] = rpcUrls.map((rpcUrl) => ({
    type: "generic" as const,
    creator: () => getProviderCreator(rpcUrl),
  }))

  return new SerialFallbackProvider(chainID, [
    ...genericProviders,
    ...boarProviderCreators,
    ...customProviderCreator,
  ])
}
