import { NoEndpointAvailableError } from "../services/chain/rpc/endpoint"
import { getErrorType } from "../services/chain/errors"
import { isTimeoutError } from "../services/chain/rpc/log-query-errors"
import logger from "./logger"

/**
 * Checks whether a request failed for a reason a smaller request can't fix: a
 * rate limit, or a provider with no endpoint left to try. Splitting the work
 * in these cases only multiplies the requests that are already being refused.
 */
export function isNotAboutSize(error: unknown): boolean {
  if (error instanceof NoEndpointAvailableError) return true
  if (typeof error === "object" && error !== null) {
    const { status, code } = error as { status?: unknown; code?: unknown }
    if (status === 429 || code === 429) return true
  }
  const text = error instanceof Error ? error.message : String(error)
  return getErrorType(text, "rpc") === "rate-limit-error"
}

/**
 * What a failed request's error said about the size of request the endpoint
 * would accept, if anything.
 */
export type SizeHints = {
  /** The largest size the endpoint advertised, respected from then on. */
  advertised?: number
  /** A size the endpoint suggested for this request only. */
  suggested?: number
}

/**
 * Tracks how large a request an endpoint, or a provider's pool of endpoints,
 * will accept for one kind of work, learning from the failures of larger
 * requests. For log queries the size is a block range; for multicalls, it is a
 * number of calls.
 *
 * AdaptiveSize only decides sizes. Callers are responsible for cutting their
 * work to fit, since what a piece of work is differs between them. Sizes follow
 * these rules:
 *
 * - Work larger than an advertised or learned maximum is cut down to that
 *   maximum before it's tried.
 * - A failure that names a size is retried at that size. If the size was
 *   advertised as a limit, it's kept for later requests too.
 * - Rate limits and providers with no endpoint left to try aren't about size,
 *   so they aren't retried at a smaller one.
 * - Any other failure is retried in halves, down to twice the minimum size.
 *   Some endpoints refuse oversized work with nothing more specific than a
 *   "bad response", so an unexplained failure may still be about size.
 * - When a request times out, the halved size is kept, so later requests start
 *   there instead of timing out their way down again.
 */
export class AdaptiveSize {
  #max: number | undefined

  /**
   * @param label A label for the work in logs, e.g. "chain 1: eth_getLogs".
   * @param unit The unit sizes are counted in, for logs, e.g. "blocks".
   * @param minimum The smallest size work is halved down to. Below twice this
   *        size, a failure is treated as a real failure rather than one about
   *        size.
   */
  constructor(
    readonly label: string,
    readonly unit: string,
    readonly minimum: number,
  ) {}

  /**
   * The largest size advertised or learned so far, or `undefined` if there
   * isn't one yet.
   */
  get max(): number | undefined {
    return this.#max
  }

  /** Checks whether work of `size` is within the known maximum, if any. */
  fits(size: number): boolean {
    return this.#max === undefined || size <= this.#max
  }

  /**
   * Records `max` as the largest size to use from now on, unless a smaller
   * maximum is already known. `why` completes the log line that explains
   * where the maximum came from, e.g. "allows" in "chain 1: eth_getLogs allows
   * at most 1000 blocks".
   */
  learn(max: number, why = "allows"): void {
    if (this.#max !== undefined && max >= this.#max) return
    this.#max = max
    logger.debug(
      `${this.label} ${why} at most ${max} ${this.unit}; using that from now on.`,
    )
  }

  /**
   * Given work of `size` that failed with `error`, returns the size to retry
   * the work in, per the rules described on the class. Returns `undefined` if
   * smaller requests wouldn't help, in which case the caller should rethrow
   * the error.
   *
   * @param hints Any size the error advertised or suggested, as parsed by the
   *        caller.
   */
  retrySizeAfter(
    error: unknown,
    size: number,
    { advertised, suggested }: SizeHints = {},
  ): number | undefined {
    if (advertised !== undefined && advertised < size) {
      this.learn(advertised)
      return advertised
    }
    if (suggested !== undefined && suggested < size) {
      return suggested
    }
    if (isNotAboutSize(error)) {
      return undefined
    }
    // Only split while both halves stay at or above the minimum; below
    // that, treat the error as a real failure.
    if (size < this.minimum * 2) {
      return undefined
    }

    const half = Math.ceil(size / 2)
    if (isTimeoutError(error)) {
      this.learn(half, `timed out for ${size} ${this.unit}; takes`)
    } else {
      logger.debug(`${this.label} failed for ${size} ${this.unit}; halving.`)
    }
    return half
  }
}
