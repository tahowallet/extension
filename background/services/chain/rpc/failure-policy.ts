import { getErrorType } from "../errors"

/** What a request should do after an attempt on an endpoint fails. */
export type NextStep =
  | { kind: "retrySameEndpoint"; delayMs: number }
  | { kind: "tryNextEndpoint" }
  | { kind: "giveUp" }

export type FailurePolicy = {
  /**
   * `attempt` counts attempts on the endpoint that just failed, starting at
   * 1.
   */
  nextStepAfter(error: unknown, method: string, attempt: number): NextStep
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
 * The rules for the standard walk and the managed endpoint. A 401 or 403
 * says something about the endpoint's key rather than the request, so it
 * moves on; any other 4xx is the request's fault everywhere, so it gives up.
 */
export const standardFailurePolicy: FailurePolicy = {
  nextStepAfter(error, method, attempt) {
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
