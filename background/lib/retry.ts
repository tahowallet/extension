import { wait } from "./utils"

export type RetryOptions = {
  /**
   * The total number of attempts, including the first. Defaults to 3.
   */
  maxAttempts?: number
  /**
   * How long to wait before the second attempt, in milliseconds. Each
   * subsequent wait doubles. Defaults to 1000.
   */
  initialDelayMs?: number
  /**
   * Whether a failed attempt should be retried, given its error and the
   * attempt number (starting at 1). Defaults to retrying every error.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

/**
 * Runs `operation`, retrying it with exponential backoff when it throws, until
 * it succeeds, `shouldRetry` rejects the error, or `maxAttempts` is reached.
 * The final error is rethrown unchanged.
 */
export async function retryWithBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  {
    maxAttempts = 3,
    initialDelayMs = 1000,
    shouldRetry = () => true,
  }: RetryOptions = {},
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      return await operation(attempt)
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error
      }

      // oxlint-disable-next-line no-await-in-loop
      await wait(initialDelayMs * 2 ** (attempt - 1))
    }
  }
}
