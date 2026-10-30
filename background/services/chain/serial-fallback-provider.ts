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
import TahoRPCProvider from "./taho-rpc-provider"
import {
  recordCircuitBreakerTransition,
  recordReconnectAttempt,
  recordReconnectFailed,
  recordReconnectSucceeded,
  recordSingleFlightCoalesce,
} from "../../lib/perf-metrics"
import Endpoint from "./rpc/endpoint"
import EndpointPool from "./rpc/endpoint-pool"
import SubscriptionManager from "./rpc/subscription-manager"
import {
  NetworkReachabilityListener,
  NetworkReachabilityState,
  NetworkReachabilityTracker,
} from "./network-reachability"
import {
  anyErrorFailsOverPolicy,
  standardFailurePolicy,
} from "./rpc/failure-policy"
import {
  capabilityPoolName,
  PoolName,
  RouteRule,
  routeRulesFor,
  ruleForMethod,
} from "./rpc/method-router"
import FailoverExecutor, { RouteStep } from "./rpc/failover-executor"
import RequestCache from "./rpc/request-cache"
import {
  performanceMetricsObserver,
  reachabilityObserver,
} from "./rpc/request-outcome-observers"

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

// How often to check and clean stale cache entries
const CACHE_CLEANUP_INTERVAL = 10 * SECOND
// How long to wait for a provider to respond before falling back to the next provider.
const PROVIDER_REQUEST_TIMEOUT = 5 * SECOND

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

  #subscriptions: SubscriptionManager

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

  /**
   * Turns request outcomes into a single reachable / unreachable verdict for
   * the chain, so callers that log and swallow an exhausted walk have
   * something to report to the user.
   */
  #reachability: NetworkReachabilityTracker

  readonly #requestCache: RequestCache

  supportsBoar = false

  /**
   * Since our architecture follows a pattern of using distinct provider instances
   * per network - and we know that a given provider will never switch its network
   * (rather - we will switch the provider the extension is using) - we can avoid
   * eth_chainId RPC calls.
   */
  private cachedChainId: string

  private routeRules: RouteRule[] = []

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
      reachabilityObserver(this.#reachability),
      performanceMetricsObserver(chainID, (endpoint) =>
        this.metricsIndexOf(endpoint),
      ),
    ])

    this.cachedChainId = utils.hexlify(Number(chainID))
    this.#requestCache = new RequestCache({
      // A provider never changes chains, so this needs no request.
      knownAnswers: { eth_chainId: this.cachedChainId },
      recentAnswerTtlMs: {
        // Temporary, to soften the burst of account enrichment when the
        // extension first loads.
        eth_getBalance: 1 * SECOND,
        // Having code rarely changes, and this resets when the service worker
        // restarts.
        eth_getCode: 600 * SECOND,
      },
      onCoalesce: () =>
        recordSingleFlightCoalesce(this.chainID, this.currentProviderIndex),
    })

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
    this.#subscriptions = new SubscriptionManager(
      this.#standardEndpoints[0],
      (endpoint, moved) => {
        const index = this.#standardEndpoints.indexOf(endpoint)
        recordReconnectAttempt(this.chainID, index)
        if (moved) {
          recordReconnectSucceeded(this.chainID, index)
        } else {
          recordReconnectFailed(this.chainID, index)
        }
      },
    )

    const standardPool = new EndpointPool("standard", this.#standardEndpoints)
    this.#pools.set("standard", standardPool)
    standardPool.onPreferredEndpointChanged((endpoint) => {
      if (!this.#destroyed) {
        this.#subscriptions
          .moveTo(endpoint)
          .catch((error) =>
            logger.error("Error moving subscriptions on chain", chainID, error),
          )
      }
    })

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

    this.updateRouteRules()
  }

  private get standardPool(): EndpointPool {
    return this.#pools.get("standard") as EndpointPool
  }

  /** The index of the walk's preferred endpoint. */
  private get currentProviderIndex(): number {
    return this.standardPool.preferredIndex
  }

  /**
   * Where an endpoint's requests are counted: its place in the walk, or
   * after the walk for method-specific endpoints.
   */
  private metricsIndexOf(endpoint: Endpoint): number {
    const standardIndex = this.#standardEndpoints.indexOf(endpoint)
    if (standardIndex >= 0) {
      return standardIndex
    }
    const methodSpecific = this.#pools.get("methodSpecific")?.endpoints ?? []
    return this.#standardEndpoints.length + methodSpecific.indexOf(endpoint)
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

  /** The pool a method routes to, then its fallback pool, if any. */
  private routeFor(method: string): RouteStep[] {
    const { pool, fallbackPool } = ruleForMethod(this.routeRules, method)
    return [pool, fallbackPool].flatMap((name) => {
      const routed = name === undefined ? undefined : this.#pools.get(name)
      if (routed === undefined) {
        return []
      }
      return [
        {
          pool: routed,
          policy:
            name === "standard" || name === "managed"
              ? standardFailurePolicy
              : anyErrorFailsOverPolicy,
        },
      ]
    })
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

    this.#subscriptions.clear()
    this.removeAllListeners()
  }

  /**
   * Drops expired cached answers so the cache doesn't grow without bound.
   */
  cleanupStaleCacheEntries(): void {
    const dropped = this.#requestCache.dropStaleAnswers()
    if (dropped > 0) {
      logger.info(
        `Cleaning up ${dropped} cache entries on RPC for chain id: ${this.chainID}`,
      )
    }
  }

  /**
   * Answers from the request cache where it can, and otherwise sends the
   * request through the pools its method routes to.
   */
  override async send(method: string, params: unknown[]): Promise<unknown> {
    // A retired provider answers nothing it would have to ask an endpoint
    // for; that endpoint may no longer be configured for this chain.
    if (!this.#requestCache.hasKnownAnswer(method)) {
      this.assertNotDestroyed()
    }

    return this.#requestCache.getOrFetch(method, params, async () => {
      const { result } = await this.#executor.send(
        { method, params, startedAt: Date.now() },
        this.routeFor(method),
        this.#lifecycle.signal,
      )
      return result
    })
  }

  /**
   * Subscribes by JSON-RPC method on a WebSocket endpoint. On a polling
   * endpoint, the subscription waits for a WebSocket one.
   */
  async subscribe(
    tag: string,
    param: Array<unknown>,
    processFunc: (result: unknown) => void,
  ): Promise<void> {
    if (!this.#destroyed) {
      await this.#subscriptions.subscribe(tag, param, processFunc)
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

  /** Like `JsonRpcProvider.on`, but the listener survives failovers. */
  override on(eventName: EventType, listener: Listener): this {
    if (!this.#destroyed) {
      this.#subscriptions.on(eventName, listener)
    }
    return this
  }

  /** Like `JsonRpcProvider.once`, but the listener survives failovers. */
  override once(eventName: EventType, listener: Listener): this {
    if (!this.#destroyed) {
      this.#subscriptions.once(eventName, listener)
    }
    return this
  }

  /** Removes one or all listeners for an event. */
  override off(eventName: EventType, listener?: Listener): this {
    this.#subscriptions.off(eventName, listener)
    return this
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
