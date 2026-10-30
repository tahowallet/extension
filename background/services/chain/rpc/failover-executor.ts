import type Endpoint from "./endpoint"
import type EndpointPool from "./endpoint-pool"
import { FailurePolicy, indicatesOutage } from "./failure-policy"

/** One logical request, which may be attempted on several endpoints. */
export type RpcRequest = {
  method: string
  params: unknown[]
  startedAt: number
}

/** Watches requests go through the executor, for metrics and reachability. */
export type RequestOutcomeObserver = {
  onAttempt?(request: RpcRequest, endpoint: Endpoint): void
  onEndpointSuccess?(request: RpcRequest, endpoint: Endpoint): void
  onEndpointFailure?(
    request: RpcRequest,
    endpoint: Endpoint,
    error: unknown,
  ): void
  /** Every endpoint in a pool failed, the last one with `error`. */
  onAllEndpointsFailed?(request: RpcRequest, error: unknown): void
}

export class NoEndpointAvailableError extends Error {
  constructor() {
    super("NETWORK_ERROR: circuit open and no fallback available")
  }
}

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
          pool.recordFailure(endpoint)
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
