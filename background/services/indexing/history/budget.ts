import { MINUTE } from "../../../constants"

/**
 * The number of calls per minute a {@link RateBudget} allows while the user
 * is active and while they are away.
 */
export type BudgetRates = { active: number; idle: number }

/**
 * A RateBudget is a slowly refilling allowance of requests to a single
 * source. It is used so that backfill trickles along while the wallet is in
 * use, and only picks up pace while the user is away.
 *
 * The budget refills continuously at its active or idle rate, but never holds
 * more than `burst` requests. That way, coming back from a long idle period
 * doesn't release a flood of requests at once.
 */
export class RateBudget {
  #available: number

  #updatedAt: number | undefined

  constructor(
    readonly rates: BudgetRates,
    readonly burst: number,
  ) {
    this.#available = burst
  }

  /**
   * Spends `cost` requests from the budget if enough are available, after
   * refilling it for the time elapsed since the last call at the rate for the
   * current `idle` state. Returns `true` if the requests were spent, or
   * `false` if the budget didn't have enough, in which case nothing is spent.
   */
  take(cost: number, now: number, idle: boolean): boolean {
    const elapsed = this.#updatedAt === undefined ? 0 : now - this.#updatedAt
    const rate = idle ? this.rates.idle : this.rates.active
    this.#available = Math.min(
      this.burst,
      this.#available + (Math.max(elapsed, 0) / MINUTE) * rate,
    )
    this.#updatedAt = now

    if (this.#available < cost) return false
    this.#available -= cost
    return true
  }
}
