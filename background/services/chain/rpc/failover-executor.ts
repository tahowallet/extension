import { NoEndpointAvailableError } from "./endpoint"
import type Endpoint from "./endpoint"
import type EndpointPool from "./endpoint-pool"
import {
  FailurePolicy,
  indicatesEndpointFault,
  indicatesOutage,
} from "./failure-policy"

/** One logical request, which may be attempted on several endpoints. */
export type RpcRequest = {
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
  onEndpointFailure?(
    request: RpcRequest,
    endpoint: Endpoint,
    error: unknown,
  ): void
  /** Every endpoint in a pool failed, the last one with `error`. */
  onAllEndpointsFailed?(request: RpcRequest, error: unknown): void
  /** The request failed for good. */
  onRequestFailed?(request: RpcRequest, error: unknown): void
}

/** A pool to walk and the policy to walk it with. */
export type RouteStep = { pool: EndpointPool; policy: FailurePolicy }

export { NoEndpointAvailableError }

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
 * Runs a request against a pool's endpoints in try order, following a
 * failure policy. All of a request's retry state lives in this loop.
 */
export default class FailoverExecutor {
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
    for (const { pool, policy } of route) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        return await this.sendWithFailover(request, pool, policy, signal)
      } catch (error) {
        lastError = error
        if (signal.aborted) {
          break
        }
      }
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
    const endpoints = pool.endpointsInTryOrder()
    let lastError: unknown = new NoEndpointAvailableError()

    for (const endpoint of endpoints) {
      for (let attempt = 1; ; attempt += 1) {
        if (signal.aborted) {
          throw signal.reason
        }
        if (!endpoint.isAvailable) {
          // It started cooling down while this request was walking.
          break
        }

        this.#notify((observer) => observer.onAttempt?.(request, endpoint))
        try {
          // oxlint-disable-next-line no-await-in-loop
          const result = await endpoint.send(request.method, request.params)
          pool.recordSuccess(endpoint)
          this.#notify((observer) =>
            observer.onEndpointSuccess?.(request, endpoint),
          )
          return { result, endpoint }
        } catch (error) {
          if (signal.aborted) {
            throw error
          }
          if (indicatesEndpointFault(error, request.method)) {
            pool.recordFailure(endpoint)
          }
          this.#notify((observer) =>
            observer.onEndpointFailure?.(request, endpoint, error),
          )
          lastError = error

          const step = policy.nextStepAfter(error, request.method, attempt)
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
        observer.onAllEndpointsFailed?.(request, lastError),
      )
    }
    throw lastError
  }

  #notify(call: (observer: RequestOutcomeObserver) => void): void {
    this.observers.forEach(call)
  }
}
