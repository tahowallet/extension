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
  FORK,
  ARBITRUM_SEPOLIA,
  BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS,
} from "../../constants"
import logger from "../../lib/logger"
import {
  ALCHEMY_CAPABILITY_NAMESPACE,
  AnyEVMTransaction,
  RpcEndpoint,
} from "../../networks"
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
import Endpoint from "./rpc/endpoint"
import EndpointPool from "./rpc/endpoint-pool"
import { isWebSocketTransport } from "./rpc/endpoint-machine"
import {
  NetworkReachabilityListener,
  NetworkReachabilityState,
  NetworkReachabilityTracker,
} from "./network-reachability"
import {
  anyErrorFailsOverPolicy,
  jitteredBackoffMs,
  standardFailurePolicy,
} from "./rpc/failure-policy"
import {
  capabilityPoolName,
  PoolName,
  RouteRule,
  routeRulesFor,
  ruleForMethod,
} from "./rpc/method-router"
import FailoverExecutor, { RpcRequest } from "./rpc/failover-executor"

export type ProviderCreator = {
  type: "boar" | "custom" | "generic"
  supportedMethods?: string[]
  /**
   * For generic providers, method-name prefixes for non-standard JSON-RPC
   * namespaces the underlying endpoint serves beyond the standard set (e.g.
   * "alchemy_"). Methods in these namespaces are routed to declaring
   * endpoints rather than walked across the full generic list.
   */
  capabilities?: string[]
  creator: () => JsonRpcProvider
}

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
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
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
 * The SerialFallbackProvider is an Ethers JsonRpcProvider that can fall back
 * through a series of endpoints in case earlier ones fail.
 *
 * Each method is routed to a pool of endpoints, which a request walks from
 * the pool's preferred endpoint, retrying and failing over as the failure
 * policy says. Subscriptions are tracked and follow the standard pool's
 * preferred endpoint.
 */
export default class SerialFallbackProvider extends JsonRpcProvider {
  // The walk's endpoints, in order. The managed endpoint, if any, leads.
  #standardEndpoints: Endpoint[]

  #pools = new Map<PoolName, EndpointPool>()

  private customProviderSupportedMethods: string[] = []

  readonly #executor: FailoverExecutor

  readonly #lifecycle = new AbortController()

  // The transport the tracked subscriptions are attached to.
  #subscribedTransport: JsonRpcProvider

  // Handles for the cache-cleanup timer, so `destroy` can stop it when this
  // provider is replaced.
  private intervalHandles: ReturnType<typeof setInterval>[] = []

  /**
   * Set once {@link destroy} has run and never cleared. Every path that would
   * build a transport checks it, so a retired provider never reopens a
   * connection to an endpoint the user has removed.
   */
  #destroyed = false

  /**
   * True once this provider has been retired by {@link destroy}. A destroyed
   * provider constructs nothing and serves nothing; callers holding one must
   * fetch the current provider for the chain instead.
   */
  get isDestroyed(): boolean {
    return this.#destroyed
  }

  /**
   * Whether this provider can currently reach its chain at all. See
   * {@link NetworkReachabilityTracker} for what "currently" means; in
   * particular a single failed call does not move this.
   */
  get reachability(): NetworkReachabilityState {
    return this.#reachability.getState()
  }

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
   * Turns request outcomes into a single reachable / unreachable verdict for
   * the chain, so callers that log and swallow an exhausted walk have
   * something to report to the user.
   */
  #reachability: NetworkReachabilityTracker

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

  supportsBoar = false

  /**
   * Since our architecture follows a pattern of using distinct provider instances
   * per network - and we know that a given provider will never switch its network
   * (rather - we will switch the provider the extension is using) - we can avoid
   * eth_chainId RPC calls.
   */
  private cachedChainId: string

  private routeRules: RouteRule[] = []

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
    onReachabilityChange?: NetworkReachabilityListener,
  ) {
    const customProviderCreators = providerCreators.filter(
      (creator) => creator.type === "custom",
    )

    const walkCreators = providerCreators.filter(
      (creator) => creator.type !== "custom",
    )

    // The first transport is built up front, since Ethers needs its
    // connection; the first endpoint takes it over.
    let firstTransport: JsonRpcProvider | undefined = walkCreators[0].creator()

    super(firstTransport.connection, firstTransport.network)

    // A retired provider has no business reporting on a chain it no longer
    // serves; its replacement speaks for the chain from here on.
    this.#reachability = new NetworkReachabilityTracker({}, (next) => {
      if (!this.#destroyed) {
        onReachabilityChange?.(next)
      }
    })

    this.#executor = new FailoverExecutor([
      {
        onEndpointSuccess: () => this.#reachability.recordSuccess(),
        onAllEndpointsFailed: () => this.#reachability.recordExhaustedWalk(),
      },
    ])

    this.#standardEndpoints = walkCreators.map(
      ({ type, capabilities, creator }, index) =>
        new Endpoint(
          {
            kind: type === "boar" ? "managed" : "standard",
            capabilities,
            createTransport:
              index === 0
                ? () => {
                    const transport = firstTransport ?? creator()
                    firstTransport = undefined
                    return transport
                  }
                : creator,
          },
          {
            onBreakerTransition: (next) =>
              recordCircuitBreakerTransition(this.chainID, index, next),
          },
        ),
    )
    // Builds the first endpoint's transport from the one above.
    this.#standardEndpoints[0].build()
    this.#subscribedTransport = this.#standardEndpoints[0].transport

    const standardPool = new EndpointPool("standard", this.#standardEndpoints)
    this.#pools.set("standard", standardPool)
    standardPool.onPreferredEndpointChanged((endpoint) =>
      this.moveSubscriptionsTo(endpoint),
    )

    const managedEndpoint = this.#standardEndpoints.find(
      ({ kind }) => kind === "managed",
    )
    if (managedEndpoint !== undefined) {
      this.supportsBoar = true
      this.#pools.set("managed", new EndpointPool("managed", [managedEndpoint]))
    }

    const capabilityEndpoints: { [namespace: string]: Endpoint[] } = {}
    this.#standardEndpoints
      .filter(({ kind }) => kind === "standard")
      .forEach((endpoint) => {
        endpoint.capabilities.forEach((namespace) => {
          capabilityEndpoints[namespace] ??= []
          capabilityEndpoints[namespace].push(endpoint)
        })
      })
    Object.entries(capabilityEndpoints).forEach(([namespace, endpoints]) => {
      const name = capabilityPoolName(namespace)
      this.#pools.set(name, new EndpointPool(name, endpoints))
    })

    if (customProviderCreators.length > 0) {
      this.addCustomProviders(customProviderCreators)
    }

    this.intervalHandles.push(
      setInterval(() => {
        this.cleanupStaleCacheEntries()
      }, CACHE_CLEANUP_INTERVAL),
    )

    this.cachedChainId = utils.hexlify(Number(chainID))
    this.updateRouteRules()
  }

  private get standardPool(): EndpointPool {
    return this.#pools.get("standard") as EndpointPool
  }

  /** The index of the walk's preferred endpoint. */
  private get currentProviderIndex(): number {
    return this.standardPool.preferredIndex
  }

  /** The walk's endpoint at a given index. */
  private standardEndpointAt(index: number): Endpoint {
    return this.#standardEndpoints[index]
  }

  private updateRouteRules(): void {
    this.routeRules = routeRulesFor({
      chainID: this.chainID,
      methodSpecificMethods: this.#pools.has("methodSpecific")
        ? this.customProviderSupportedMethods
        : undefined,
      capabilityNamespaces: [...this.#pools.keys()]
        .filter((name) => name.startsWith("capability:"))
        .map((name) => name.slice("capability:".length)),
      hasManagedEndpoint: this.#pools.has("managed"),
    })
  }

  /**
   * Sends a request through the pool its method routes to, then through the
   * route's fallback pool if every endpoint in the first one failed.
   */
  private async sendRouted(
    request: RpcRequest,
  ): Promise<{ result: unknown; endpoint: Endpoint }> {
    const { pool, fallbackPool } = ruleForMethod(
      this.routeRules,
      request.method,
    )

    try {
      return await this.sendThroughPool(request, pool)
    } catch (error) {
      if (fallbackPool === undefined || !this.#pools.has(fallbackPool)) {
        throw error
      }
      return this.sendThroughPool(request, fallbackPool)
    }
  }

  private sendThroughPool(
    request: RpcRequest,
    name: PoolName,
  ): Promise<{ result: unknown; endpoint: Endpoint }> {
    const pool = this.#pools.get(name) ?? this.standardPool
    const policy =
      name === "standard" || name === "managed"
        ? standardFailurePolicy
        : anyErrorFailsOverPolicy

    return this.#executor.sendWithFailover(
      request,
      pool,
      policy,
      this.#lifecycle.signal,
    )
  }

  /**
   * The error every path rejects with once this provider has been retired.
   */
  private destroyedError(): Error {
    return new Error(
      `Provider for chain ${this.chainID} has been destroyed and cannot serve requests`,
    )
  }

  /**
   * Throws if this provider has been retired, guarding every path that would
   * otherwise construct a fresh underlying provider — and so reopen a
   * connection to an endpoint that is no longer configured.
   */
  private assertNotDestroyed(): void {
    if (this.#destroyed) {
      throw this.destroyedError()
    }
  }

  /**
   * True if this network can serve Alchemy enhanced API calls (alchemy_*),
   * either via an endpoint that declares the "alchemy_" capability or via
   * Boar while it remains available.
   */
  get supportsAlchemy(): boolean {
    return (
      this.#pools.has(capabilityPoolName(ALCHEMY_CAPABILITY_NAMESPACE)) ||
      (this.supportsBoar &&
        !BOAR_ALCHEMY_UNSUPPORTED_CHAIN_IDS.has(this.chainID))
    )
  }

  addCustomProvider(customProviderCreator: ProviderCreator): void {
    this.addCustomProviders([customProviderCreator])
  }

  /**
   * Sets the custom providers for this network, replacing any existing ones.
   * The creators are used in priority order: the first one is used until it
   * fails, at which point later ones act as fallbacks.
   */
  addCustomProviders(customProviderCreators: ProviderCreator[]): void {
    if (this.#destroyed) {
      // A retired provider takes no new endpoints; whoever is configuring the
      // chain should be holding its replacement.
      return
    }

    if (customProviderCreators.length === 0) {
      this.removeCustomProvider()
      return
    }

    this.customProviderSupportedMethods =
      customProviderCreators[0].supportedMethods ?? []
    // The old endpoints are stale and, for WebSockets, still connected.
    this.disposeMethodSpecificPool()
    const endpoints = customProviderCreators.map(
      ({ creator, supportedMethods }) =>
        new Endpoint({
          kind: "method-specific",
          methods: supportedMethods,
          createTransport: creator,
        }),
    )
    // Built up front, as it always has been.
    endpoints[0].build()
    this.#pools.set(
      "methodSpecific",
      new EndpointPool("methodSpecific", endpoints),
    )
    this.updateRouteRules()
  }

  removeCustomProvider(): void {
    this.customProviderSupportedMethods = []
    this.disposeMethodSpecificPool()
    this.updateRouteRules()
  }

  private disposeMethodSpecificPool(): void {
    const pool = this.#pools.get("methodSpecific")
    pool?.dispose()
    pool?.endpoints.forEach((endpoint) => endpoint.dispose())
    this.#pools.delete("methodSpecific")
  }

  /**
   * Retires this provider for good.
   *
   * Latches the instance as destroyed, cancels requests in flight, clears the
   * cache-cleanup timer, and disposes every endpoint, dropping their
   * listeners and closing any WebSockets. Without this, a replaced provider
   * keeps polling and reconnecting to endpoints that are no longer
   * configured for the lifetime of the service worker; see
   * `ProviderRegistry`.
   */
  destroy(): void {
    this.#destroyed = true
    this.#lifecycle.abort(this.destroyedError())

    this.intervalHandles.forEach((handle) => clearInterval(handle))
    this.intervalHandles = []

    this.disposeMethodSpecificPool()
    this.#pools.forEach((pool) => pool.dispose())
    this.#standardEndpoints.forEach((endpoint) => endpoint.dispose())

    // Stop tracking subscriptions so nothing gets restored onto a retired
    // provider, and drop the listeners registered on this instance itself.
    this.subscriptions = []
    this.eventSubscriptions = []
    this.removeAllListeners()
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

    // A retired provider answers nothing; anything else would mean connecting
    // to an endpoint that is no longer configured for this chain.
    this.assertNotDestroyed()

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
    const startingProviderIndex = this.currentProviderIndex
    recordRequestSent(this.chainID, startingProviderIndex)
    const startTime = Date.now()

    const cached = this.checkForCachedResult(method, params)
    if (cached !== undefined) {
      recordRequestSucceeded(
        this.chainID,
        startingProviderIndex,
        Date.now() - startTime,
      )
      return cached.result
    }

    try {
      const { result, endpoint } = await this.sendRouted({
        method,
        params,
        startedAt: startTime,
      })

      // Record against the endpoint that actually served the request.
      const servingIndex = this.#standardEndpoints.indexOf(endpoint)
      recordRequestSucceeded(
        this.chainID,
        servingIndex >= 0 ? servingIndex : startingProviderIndex,
        Date.now() - startTime,
      )

      // Cache results for method/param combinations that are frequently called subsequently
      this.conditionallyCacheResult(result, { method, params })

      return result
    } catch (error) {
      recordRequestFailed(
        this.chainID,
        startingProviderIndex,
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
    const transport = this.#subscribedTransport

    if (isWebSocketTransport(transport)) {
      // oxlint-disable-next-line no-underscore-dangle
      await transport._subscribe(tag, param, processFunc)
      this.subscriptions.push(subscription)
    } else {
      logger.warn(
        "Current provider ",
        transport,
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

    if (!this.#destroyed) {
      this.#subscribedTransport.on(eventName, listener)
    }

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

    if (!this.#destroyed) {
      this.#subscribedTransport.once(eventName, listener)
    }

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

    if (!this.#destroyed) {
      this.#subscribedTransport.off(eventName, listenerToRemove)
    }

    return this
  }

  /**
   * Moves tracked subscriptions off the transport they are on and onto the
   * given endpoint's. A WebSocket is closed so its subscriptions stop; its
   * endpoint opens a fresh one.
   */
  private async moveSubscriptionsTo(endpoint: Endpoint): Promise<void> {
    if (this.#destroyed) {
      return
    }

    const previous = this.#subscribedTransport
    if (isWebSocketTransport(previous)) {
      previous.destroy()
    } else {
      this.eventSubscriptions.forEach(({ eventName, listener }) =>
        previous.off(eventName, listener),
      )
    }

    const index = this.#standardEndpoints.indexOf(endpoint)
    recordReconnectAttempt(this.chainID, index)

    this.#subscribedTransport = endpoint.transport
    const resubscribed = await this.resubscribe(endpoint)
    if (resubscribed) {
      recordReconnectSucceeded(this.chainID, index)
    } else {
      recordReconnectFailed(this.chainID, index)
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
   * Resubscribes existing WebSocket subscriptions (if the endpoint is a
   * WebSocket) and regular Ethers subscriptions (for all endpoints).
   * @returns Whether the endpoint was ready to take the subscriptions
   */
  private async resubscribe(endpoint: Endpoint): Promise<boolean> {
    logger.debug("Resubscribing subscriptions", "on chain", this.chainID, "...")

    try {
      await endpoint.whenReady()
    } catch {
      return false
    }

    const provider = endpoint.transport
    if (!provider.network) {
      return false
    }

    if (isWebSocketTransport(provider)) {
      // Chain promises to serially resubscribe.
      await this.subscriptions.reduce(
        (previousPromise, { tag, param, processFunc }) =>
          previousPromise.then(() =>
            waitAnd(jitteredBackoffMs(), () =>
              // Direct subscriptions are internal, but we want to be able to
              // restore them.
              // oxlint-disable-next-line no-underscore-dangle
              provider._subscribe(tag, param, processFunc),
            ),
          ),
        Promise.resolve(),
      )
    }

    this.eventSubscriptions.forEach(({ eventName, listener, once }) => {
      // Transports are reused, so one coming back into service may still
      // carry these listeners from an earlier stint; Ethers would happily
      // attach a second copy and fire each event twice.
      provider.off(eventName, listener)

      if (once) {
        provider.once(eventName, listener)
      } else {
        provider.on(eventName, listener)
      }
    })

    logger.debug("Subscriptions resubscribed", "on chain", this.chainID, "...")
    return true
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
  rpcEndpoints: RpcEndpoint[],
  customRpc?: RpcConfig,
  onReachabilityChange?: NetworkReachabilityListener,
): SerialFallbackProvider {
  if (isEnabled(FeatureFlags.USE_MAINNET_FORK)) {
    return new SerialFallbackProvider(
      FORK.chainID,
      [
        {
          type: "generic" as const,
          creator: () => new TahoRPCProvider(process.env.MAINNET_FORK_URL),
        },
      ],
      onReachabilityChange,
    )
  }

  if (
    chainID === ARBITRUM_SEPOLIA.chainID &&
    process.env.ARBITRUM_FORK_RPC !== undefined &&
    process.env.ARBITRUM_FORK_RPC.trim() !== "" &&
    process.env.SUPPORT_THE_ISLAND_ON_TENDERLY === "true"
  ) {
    // oxlint-disable-next-line no-console
    console.log(
      "%c🦴 Using Tenderly fork as Arbitrum Sepolia provider",
      "background: #071111; color: #fff; font-weight: 900;",
    )
    return new SerialFallbackProvider(
      ARBITRUM_SEPOLIA.chainID,
      [
        {
          type: "generic" as const,
          creator: () => new TahoRPCProvider(process.env.ARBITRUM_FORK_RPC),
        },
      ],
      onReachabilityChange,
    )
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

  // One provider creator per custom RPC URL; URLs past the first act as
  // fallbacks for the ones before them.
  const customProviderCreators: ProviderCreator[] = (
    customRpc?.rpcUrls ?? []
  ).map((rpcUrl) => ({
    type: "custom" as const,
    supportedMethods: customRpc?.supportedMethods ?? [],
    creator: () => getProviderCreator(rpcUrl),
  }))

  const genericProviders: ProviderCreator[] = rpcEndpoints.map(
    ({ url, capabilities }) => ({
      type: "generic" as const,
      capabilities,
      creator: () => getProviderCreator(url),
    }),
  )

  // The Taho-managed (Boar) endpoint leads the serial walk, so it serves every
  // method first when it is available for the chain, with the user-visible,
  // stored endpoints acting as fallbacks behind it. This matches what the
  // network settings UI promises about managed endpoints being the first
  // choice. Custom providers are not part of the walk; they are consulted
  // ahead of it for the methods they declare support for.
  return new SerialFallbackProvider(
    chainID,
    [...boarProviderCreators, ...genericProviders, ...customProviderCreators],
    onReachabilityChange,
  )
}
