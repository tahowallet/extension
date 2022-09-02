import { logger } from "ethers"

const DEFAULT_TIMEOUT = 3_000

const makeFetchWithTimeout = (timeoutMs: number) => {
  return async function fetchWithTimeout(
    requestInfo: RequestInfo,
    options?: RequestInit | undefined
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
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, prettier/prettier
const fetchWithTimeout = (timeoutMs = DEFAULT_TIMEOUT) => makeFetchWithTimeout(timeoutMs)

export default fetchWithTimeout
