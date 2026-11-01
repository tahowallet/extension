import { getErrorType } from "../errors"
import logger from "../../../lib/logger"
import type { NetworkReachabilityTracker } from "../network-reachability"
import {
  recordRequestFailed,
  recordRequestSent,
  recordRequestSucceeded,
} from "../../../lib/perf-metrics"
import type Endpoint from "./endpoint"
import { NoEndpointAvailableError } from "./endpoint"
import { redactUrls } from "./endpoint-label"
import type { RequestOutcomeObserver, RpcRequest } from "./failover-executor"
import {
  httpStatusOf,
  indicatesEndpointFault,
  NextStep,
} from "./failure-policy"

/**
 * Feeds the reachability tracker. Only requests the executor runs count, so
 * cached answers never vouch for the chain.
 */
export function reachabilityObserver(
  tracker: NetworkReachabilityTracker,
): RequestOutcomeObserver {
  return {
    onEndpointSuccess: () => tracker.recordSuccess(),
    onAllEndpointsFailed: () => tracker.recordExhaustedWalk(),
  }
}

/**
 * Records request metrics: sends and failures against the endpoint a request
 * started on, successes against the endpoint that answered.
 */
export function performanceMetricsObserver(
  chainID: string,
  metricsIndexOf: (endpoint: Endpoint) => number,
  now: () => number = Date.now,
): RequestOutcomeObserver {
  const startingIndexes = new WeakMap<RpcRequest, number>()

  return {
    onRequestStarted(request, pool) {
      const index = metricsIndexOf(pool.preferredEndpoint)
      startingIndexes.set(request, index)
      recordRequestSent(chainID, index)
    },
    onEndpointSuccess(request, endpoint) {
      recordRequestSucceeded(
        chainID,
        metricsIndexOf(endpoint),
        now() - request.startedAt,
      )
    },
    onRequestFailed(request, error) {
      recordRequestFailed(
        chainID,
        startingIndexes.get(request) ?? 0,
        getErrorType(String(error), request.method),
      )
    },
  }
}

const MAX_DESCRIPTION_LENGTH = 300

/**
 * A short description of an RPC error for log lines. Ethers' full messages
 * list the request's URL, which can hold an API key, so this keeps to the
 * reason, the inner error's message and the codes, with any URL cut to its
 * host.
 */
export function describeRpcError(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return redactUrls(String(error)).slice(0, MAX_DESCRIPTION_LENGTH)
  }

  const {
    reason,
    message,
    code,
    error: inner,
  } = error as {
    reason?: unknown
    message?: unknown
    code?: unknown
    error?: { message?: unknown }
  }
  const status = httpStatusOf(error)

  const text = [
    typeof reason === "string" ? reason : String(message ?? error),
    typeof inner?.message === "string" ? inner.message : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(": ")
  const codes = [
    typeof code === "string" || typeof code === "number"
      ? `code ${code}`
      : undefined,
    status === undefined ? undefined : `HTTP ${status}`,
  ].filter((part) => part !== undefined)

  return redactUrls(
    codes.length === 0 ? text : `${text} (${codes.join(", ")})`,
  ).slice(0, MAX_DESCRIPTION_LENGTH)
}

/** What a failed attempt leads to, for the log line. */
function describeStep(step: NextStep): string {
  switch (step.kind) {
    case "retrySameEndpoint":
      return `retrying in ${Math.round(step.delayMs)} ms`
    case "tryNextEndpoint":
      return "trying the next endpoint"
    default:
      return "not retrying, since the error is about the request"
  }
}

/**
 * Logs each failover decision: retries and moves at debug, exhausted pools
 * at warn, and a request that fails for good at warn when its endpoints were
 * at fault. Successes aren't logged.
 */
export function loggingObserver(): RequestOutcomeObserver {
  const lastTried = new WeakMap<RpcRequest, Endpoint>()
  // The last endpoint tried, or just the chain if none was.
  const whereFailed = (request: RpcRequest) =>
    lastTried.get(request)?.label ?? `chain ${request.chainID}`

  return {
    onAttempt(request, endpoint) {
      lastTried.set(request, endpoint)
    },
    onEndpointFailure(request, endpoint, error, step) {
      logger.debug(
        `${endpoint.label}: ${request.method} failed with ${describeRpcError(error)}; ${describeStep(step)}.`,
      )
    },
    onAllEndpointsFailed(request, error, pool) {
      logger.warn(
        `${whereFailed(request)}: ${request.method} failed on every endpoint in the ${pool.name} pool, ending with ${describeRpcError(error)}.`,
      )
    },
    onRequestFailed(request, error) {
      const atFault =
        error instanceof NoEndpointAvailableError ||
        indicatesEndpointFault(error, request.method)
      logger[atFault ? "warn" : "debug"](
        `${whereFailed(request)}: giving up on ${request.method} with ${describeRpcError(error)}.`,
      )
    },
  }
}
