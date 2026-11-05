import logger from "../../../lib/logger"
import { NoEndpointAvailableError } from "./endpoint"
import type Endpoint from "./endpoint"
import type EndpointPool from "./endpoint-pool"
import { attachRpcContext } from "./error-context"
import {
  FailurePolicy,
  indicatesEndpointFault,
  indicatesOutage,
  NextStep,
} from "./failure-policy"

/** One logical request, which may be attempted on several endpoints. */
export type RpcRequest = {
  chainID: string
  method: string
  params: unknown[]
  startedAt: number
}

/** Watches requests go through the executor, for metrics and reachability. */
export type RequestOutcomeObserver = {
  /** A request is about to walk its first pool. */
  onRequestStarted?(request: RpcRequest, pool: EndpointPool): void
  onAttempt?(request: RpcRequest, endpoint: Endpoint): void
  onEndpointSuccess?(request: RpcRequest, endpoint: Endpoint): void
  /** An attempt failed, and the request takes `step` next. */
  onEndpointFailure?(
    request: RpcRequest,
    endpoint: Endpoint,
    error: unknown,
    step: NextStep,
  ): void
  /** Every endpoint in a pool failed, the last one with `error`. */
  onAllEndpointsFailed?(
    request: RpcRequest,
    error: unknown,
    pool: EndpointPool,
  ): void
  /** The request failed for good. */
  onRequestFailed?(request: RpcRequest, error: unknown): void
}

/** A pool to walk and the policy to walk it with. */
export type RouteStep = { pool: EndpointPool; policy: FailurePolicy }

export { NoEndpointAvailableError }

/** Settles with `promise`, or rejects with the abort reason first. */
const untilAborted = <T>(promise: Promise<T>, signal: AbortSignal) =>
  new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener("abort", abort, { once: true })
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort))
  })

const abortable = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, ms)
    const abort = () => {
      clearTimeout(timeout)
      reject(signal.reason)
    }
    signal.addEventListener("abort", abort, { once: true })
  })

/**
 * A pool's only endpoint, if it's cooling down. Failing every request
 * outright until it recovers would leave the pool's methods with nowhere to
 * go, so it's tried anyway.
 */
function onlyEndpointOf(pool: EndpointPool): Endpoint | undefined {
  const [only, ...others] = pool.endpoints
  return others.length === 0 &&
    only !== undefined &&
    !only.isAvailable &&
    !only.isDisposed
    ? only
    : undefined
}

/**
 * Runs a request against a pool's endpoints in try order, following a
 * failure policy. All of a request's retry state lives in this loop.
 */
export default class FailoverExecutor {
  // The endpoint each request last tried, for the context on its error.
  readonly #lastTried = new WeakMap<RpcRequest, Endpoint>()

  /**
   * The methods each endpoint has refused to serve at all, such as log queries
   * on dRPC's free plan, which refuses them however narrow the range, or on
   * Rootstock's public node, which answers that `eth_getLogs` doesn't exist.
   * They aren't sent to that endpoint again this session while another
   * endpoint in the pool can take them.
   */
  readonly #refusedMethods = new WeakMap<Endpoint, Set<string>>()

  constructor(
    private readonly observers: readonly RequestOutcomeObserver[] = [],
    private readonly wait: (
      ms: number,
      signal: AbortSignal,
    ) => Promise<void> = abortable,
  ) {}

  /**
   * Walks each pool in turn until one answers, so a route's fallback pool
   * only sees requests its first pool couldn't serve.
   */
  async send(
    request: RpcRequest,
    route: readonly RouteStep[],
    signal: AbortSignal,
  ): Promise<{ result: unknown; endpoint: Endpoint }> {
    this.#notify((observer) =>
      observer.onRequestStarted?.(request, route[0].pool),
    )

    let lastError: unknown = new NoEndpointAvailableError()
    for (const [index, { pool, policy }] of route.entries()) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        return await this.sendWithFailover(request, pool, policy, signal)
      } catch (error) {
        lastError = error
        if (signal.aborted) {
          break
        }
        const next = route[index + 1]
        if (next !== undefined) {
          logger.debug(
            `chain ${request.chainID}: ${request.method} failed in the ${pool.name} pool; falling back to the ${next.pool.name} pool.`,
          )
        }
      }
    }

    // An abort's reason, such as the provider's destroyed error, is thrown
    // as it is.
    if (!signal.aborted) {
      attachRpcContext(lastError, {
        chainID: request.chainID,
        method: request.method,
        endpoint: this.#lastTried.get(request)?.label,
      })
    }
    this.#notify((observer) => observer.onRequestFailed?.(request, lastError))
    throw lastError
  }

  async sendWithFailover(
    request: RpcRequest,
    pool: EndpointPool,
    policy: FailurePolicy,
    signal: AbortSignal,
  ): Promise<{ result: unknown; endpoint: Endpoint }> {
    const lastResort = onlyEndpointOf(pool)
    const endpoints =
      lastResort === undefined
        ? this.#withoutRefusals(pool.endpointsInTryOrder(), request.method)
        : [lastResort]
    let lastError: unknown = new NoEndpointAvailableError()
    if (lastResort !== undefined) {
      logger.debug(
        `${lastResort.label}: trying ${request.method} although it's cooling down, since it's the ${pool.name} pool's only endpoint.`,
      )
    }

    for (const endpoint of endpoints) {
      const probe = endpoint === lastResort
      for (let attempt = 1; ; attempt += 1) {
        if (signal.aborted) {
          throw signal.reason
        }
        if (!probe && !endpoint.isAvailable) {
          logger.debug(
            `${endpoint.label}: skipping it for ${request.method}, since it started cooling down.`,
          )
          break
        }

        this.#lastTried.set(request, endpoint)
        this.#notify((observer) => observer.onAttempt?.(request, endpoint))
        try {
          // oxlint-disable-next-line no-await-in-loop
          const result = await untilAborted(
            endpoint.send(request.method, request.params, { probe }),
            signal,
          )
          pool.recordSuccess(endpoint)
          this.#notify((observer) =>
            observer.onEndpointSuccess?.(request, endpoint),
          )
          return { result, endpoint }
        } catch (error) {
          if (signal.aborted) {
            throw signal.reason
          }
          if (indicatesEndpointFault(error, request.method)) {
            pool.recordFailure(endpoint)
          }
          const step = policy.nextStepAfter(
            error,
            request.method,
            attempt,
            request.params,
          )
          if (step.kind === "tryNextEndpoint" && step.refusesMethod === true) {
            this.#rememberRefusal(endpoint, request.method)
          }
          this.#notify((observer) =>
            observer.onEndpointFailure?.(request, endpoint, error, step),
          )
          lastError = error

          if (step.kind === "giveUp") {
            throw error
          }
          if (step.kind === "tryNextEndpoint") {
            break
          }
          // oxlint-disable-next-line no-await-in-loop
          await this.wait(step.delayMs, signal)
        }
      }
    }

    if (
      lastError instanceof NoEndpointAvailableError ||
      indicatesOutage(lastError, request.method)
    ) {
      this.#notify((observer) =>
        observer.onAllEndpointsFailed?.(request, lastError, pool),
      )
    }
    throw lastError
  }

  /**
   * Returns `endpoints` without those that refused `method`. If every one of
   * them did, returns them all, so they're asked again and the caller still
   * hears why the method fails.
   */
  #withoutRefusals(endpoints: Endpoint[], method: string): Endpoint[] {
    const serving = endpoints.filter(
      (endpoint) => !this.#refusedMethods.get(endpoint)?.has(method),
    )
    return serving.length === 0 ? endpoints : serving
  }

  #rememberRefusal(endpoint: Endpoint, method: string): void {
    const refused = this.#refusedMethods.get(endpoint) ?? new Set<string>()
    this.#refusedMethods.set(endpoint, refused)
    if (!refused.has(method)) {
      refused.add(method)
      logger.debug(
        `${endpoint.label}: refuses ${method} outright; not asking it again while another endpoint can answer.`,
      )
    }
  }

  #notify(call: (observer: RequestOutcomeObserver) => void): void {
    this.observers.forEach(call)
  }
}
