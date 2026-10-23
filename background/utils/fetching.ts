import { logger } from "ethers"

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
