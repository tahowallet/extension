import { getErrorType } from "../errors"
import {
  isBlockRangeLimitError,
  isLogQueryRefusedError,
  isLogRangeRefusal,
  isMethodNotFoundError,
  isPrunedHistoryError,
  logQueryBlockCount,
} from "./log-query-errors"

/**
 * What a request should do after an attempt on an endpoint fails. A
 * `tryNextEndpoint` step with `refusesMethod` set means the endpoint won't
 * serve the method at all, so it isn't asked for that method again while
 * other endpoints can be.
 */
export type NextStep =
  | { kind: "retrySameEndpoint"; delayMs: number }
  | { kind: "tryNextEndpoint"; refusesMethod?: boolean }
  | { kind: "giveUp" }

export type FailurePolicy = {
  /**
   * `attempt` counts attempts on the endpoint that just failed, starting at
   * 1. `params` are the request's parameters, for errors that can only be
   * read against what was asked, such as a range complaint about an
   * `eth_getLogs` filter.
   */
  nextStepAfter(
    error: unknown,
    method: string,
    attempt: number,
    params?: readonly unknown[],
  ): NextStep
}

// Attempts on one endpoint before an invalid response moves on.
const MAX_ATTEMPTS_PER_ENDPOINT = 4

/** Between 400 and 800 ms. */
export function jitteredBackoffMs(): number {
  return 400 + 400 * Math.random()
}

/**
 * Extracts the HTTP status code from an error object, if present. Ethers
 * errors store it in different places depending on the error type.
 */
export function httpStatusOf(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    if ("status" in error && typeof error.status === "number") {
      return error.status
    }
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return error.statusCode
    }
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
 * True for errors that say the endpoint couldn't be reached or wouldn't
 * answer, as opposed to errors about the request. Only these count toward a
 * chain being unreachable.
 */
export function indicatesOutage(error: unknown, method: string): boolean {
  const type = getErrorType(String(error), method)
  return (
    type === "network-error" ||
    type === "rate-limit-error" ||
    type === "response-error"
  )
}

/**
 * Refusals of what a request asked for, such as a log range wider than the
 * endpoint allows or blocks older than it keeps, whatever status they come
 * with.
 */
function refusesTheRequest(error: unknown): boolean {
  return isBlockRangeLimitError(error) || isPrunedHistoryError(error)
}

/**
 * A log query this endpoint won't serve at all, which the next may. Limited
 * to eth_getLogs, since the same wordings mean a rate limit elsewhere.
 */
function refusesThisLogQuery(error: unknown, method: string): boolean {
  return method === "eth_getLogs" && isLogQueryRefusedError(error)
}

/**
 * Checks whether a log range complaint means this endpoint won't serve the
 * query at any range, as when dRPC's free plan says a 157-block query is
 * "over 10000 blocks". Narrowing the range on the same endpoint would only
 * get the same refusal.
 */
function refusesLogQueriesAtAnyRange(
  error: unknown,
  method: string,
  params: readonly unknown[],
): boolean {
  return (
    method === "eth_getLogs" &&
    isLogRangeRefusal(error, logQueryBlockCount(params))
  )
}

/**
 * Checks whether the endpoint doesn't serve log queries at all, as when
 * Rootstock's public node answers -32601, "the method eth_getLogs does not
 * exist/is not available". Note that other methods are left to the usual
 * rules, since callers such as the `eth_simulateV1` probe read this error
 * themselves.
 */
function lacksLogQueries(error: unknown, method: string): boolean {
  return method === "eth_getLogs" && isMethodNotFoundError(error)
}

/**
 * True for errors that are the endpoint's fault, which count toward its
 * cooldown. Reverts, client errors and other errors about the request don't.
 */
export function indicatesEndpointFault(
  error: unknown,
  method: string,
): boolean {
  if (
    refusesTheRequest(error) ||
    refusesThisLogQuery(error, method) ||
    lacksLogQueries(error, method)
  ) {
    return false
  }
  if (indicatesOutage(error, method)) {
    return true
  }
  if (getErrorType(String(error), method) !== "invalid-response-error") {
    return false
  }

  const status = httpStatusOf(error)
  const isClientError = status !== undefined && status >= 400 && status < 500
  return !isClientError || status === 401 || status === 403
}

/**
 * The rules for the standard walk and the managed endpoint. A 401 or 403
 * says something about the endpoint's key rather than the request, so it
 * moves on; any other 4xx is the request's fault everywhere, so it gives up.
 */
export const standardFailurePolicy: FailurePolicy = {
  nextStepAfter(error, method, attempt, params = []) {
    if (
      refusesLogQueriesAtAnyRange(error, method, params) ||
      lacksLogQueries(error, method)
    ) {
      return { kind: "tryNextEndpoint", refusesMethod: true }
    }
    // Another endpoint may keep older blocks, or serve the query at all.
    if (isPrunedHistoryError(error) || refusesThisLogQuery(error, method)) {
      return { kind: "tryNextEndpoint" }
    }
    if (refusesTheRequest(error)) {
      return { kind: "giveUp" }
    }
    if (indicatesOutage(error, method)) {
      return { kind: "tryNextEndpoint" }
    }

    if (getErrorType(String(error), method) !== "invalid-response-error") {
      return { kind: "giveUp" }
    }

    const status = httpStatusOf(error)
    if (status !== undefined && status >= 400 && status < 500) {
      return status === 401 || status === 403
        ? { kind: "tryNextEndpoint" }
        : { kind: "giveUp" }
    }

    return attempt < MAX_ATTEMPTS_PER_ENDPOINT
      ? { kind: "retrySameEndpoint", delayMs: jitteredBackoffMs() }
      : { kind: "tryNextEndpoint" }
  },
}

/**
 * The rule for capability and method-specific endpoints, which have always
 * moved on after any error.
 */
export const anyErrorFailsOverPolicy: FailurePolicy = {
  nextStepAfter() {
    return { kind: "tryNextEndpoint" }
  },
}
