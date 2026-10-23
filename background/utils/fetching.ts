import { errors, logger } from "ethers"

const DEFAULT_TIMEOUT = 10000

export const makeFetchWithTimeout = (timeoutMs: number) =>
  // oxlint-disable-next-line typescript/explicit-module-boundary-types
  async function fetchWithTimeout(
    requestInfo: RequestInfo,
    options?: RequestInit,
  ) {
    const controller = new AbortController()
    const id = setTimeout(() => {
      logger.warn("Request to ", requestInfo, " timed out")
      return controller.abort()
    }, timeoutMs)
    const response = await fetch(requestInfo, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(id)
    return response
  }

export const fetchWithTimeout = makeFetchWithTimeout(DEFAULT_TIMEOUT)

/**
 * Whether an error thrown by ethers' `fetchJson` is likely transient and worth
 * retrying: a timeout, a request that got no response at all, or a 5xx.
 * `fetchJson` already retries rate limited (429) responses itself, and other
 * 4xx responses won't change on a retry.
 */
export function isTransientFetchJsonError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  if (error.code === errors.TIMEOUT) {
    return true
  }

  if (error.code !== errors.SERVER_ERROR) {
    return false
  }

  const status = "status" in error ? error.status : undefined
  return typeof status !== "number" || status >= 500
}
