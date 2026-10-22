/**
 * Per-provider circuit breaker used by {@link SerialFallbackProvider} to
 * suppress traffic toward a provider that is already known to be failing.
 *
 * Motivation: when an upstream RPC rate-limits or goes down, the existing
 * retry/failover logic still issues a fresh request on every send, each
 * one racing through its own backoff walk before eventually concluding
 * the provider is bad. Multiplied across concurrent callers and across
 * tracked networks, this produces a herd that keeps the failing
 * provider's condition from recovering and keeps the extension busy
 * retrying work that is guaranteed to fail.
 *
 * A circuit breaker replaces that per-call rediscovery with a single
 * piece of shared state. A run of failures trips it open; while open,
 * callers skip the provider outright and fall back. After a cooldown it
 * goes half-open, allowing exactly one probe through. The probe's result
 * either closes the breaker (recovery) or re-opens it with a longer
 * cooldown (still down).
 *
 * State is held entirely in memory. Service worker restarts reset the
 * breaker, which is acceptable: the breaker's purpose is to dampen
 * short-term herd behavior, not to preserve outage history across
 * lifetimes.
 */

export type CircuitBreakerState = "closed" | "open" | "half-open"

export type CircuitBreakerOptions = {
  /** Number of failures within the rolling window that trips the breaker. */
  failureThreshold: number
  /** Width of the rolling failure window in milliseconds. */
  failureWindowMs: number
  /** Cooldown applied the first time the breaker opens. */
  initialCooldownMs: number
  /** Upper bound for cooldowns after repeated re-opens. */
  maxCooldownMs: number
  /** Multiplier applied to the cooldown on each re-open. */
  cooldownBackoffMultiplier: number
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  failureWindowMs: 30_000,
  initialCooldownMs: 15_000,
  maxCooldownMs: 2 * 60_000,
  cooldownBackoffMultiplier: 2,
}

/**
 * Callback invoked when the breaker transitions between states. Useful for
 * emitting analytics counters without coupling the breaker itself to the
 * perf-metrics module.
 */
export type CircuitBreakerListener = (next: CircuitBreakerState) => void

export class CircuitBreaker {
  private state: CircuitBreakerState = "closed"

  private failureTimestamps: number[] = []

  private openedAt = 0

  private currentCooldownMs: number

  private probeInFlight = false

  private readonly options: CircuitBreakerOptions

  constructor(
    options: Partial<CircuitBreakerOptions> = {},
    private readonly onTransition?: CircuitBreakerListener,
    private readonly now: () => number = Date.now,
  ) {
    this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options }
    this.currentCooldownMs = this.options.initialCooldownMs
  }

  /**
   * Returns the observable state. In `"open"` and `"half-open"`, pending
   * cooldown transitions may be driven by calling {@link canRequest}.
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Decide whether a request may proceed to the underlying provider.
   *
   * - `closed`: always allow.
   * - `open`: allow only if the cooldown has elapsed, transitioning to
   *   half-open in that case.
   * - `half-open`: allow exactly one probe at a time; concurrent callers
   *   receive `false` so they fall back instead of piling onto the probe.
   */
  canRequest(): boolean {
    if (this.state === "closed") {
      return true
    }

    if (this.state === "open") {
      if (this.now() - this.openedAt < this.currentCooldownMs) {
        return false
      }
      this.transitionTo("half-open")
    }

    if (this.state === "half-open") {
      if (this.probeInFlight) {
        return false
      }
      this.probeInFlight = true
      return true
    }

    return false
  }

  /**
   * Record a successful request. Resets the failure window; in `half-open`
   * closes the breaker and resets the cooldown back to its initial value.
   */
  recordSuccess(): void {
    this.failureTimestamps = []
    if (this.state === "half-open") {
      this.probeInFlight = false
      this.currentCooldownMs = this.options.initialCooldownMs
      this.transitionTo("closed")
    }
  }

  /**
   * Record a failed request. In `closed`, trips the breaker if the failure
   * threshold has been crossed within the rolling window. In `half-open`,
   * re-opens the breaker with a longer cooldown.
   */
  recordFailure(): void {
    const now = this.now()

    if (this.state === "half-open") {
      this.probeInFlight = false
      this.currentCooldownMs = Math.min(
        this.currentCooldownMs * this.options.cooldownBackoffMultiplier,
        this.options.maxCooldownMs,
      )
      this.openedAt = now
      this.transitionTo("open")
      return
    }

    if (this.state === "open") {
      // Treat stray failures during open as noise; they don't extend the
      // cooldown beyond what a failed probe would.
      return
    }

    this.failureTimestamps.push(now)
    const windowStart = now - this.options.failureWindowMs
    this.failureTimestamps = this.failureTimestamps.filter(
      (t) => t >= windowStart,
    )

    if (this.failureTimestamps.length >= this.options.failureThreshold) {
      this.currentCooldownMs = this.options.initialCooldownMs
      this.openedAt = now
      this.failureTimestamps = []
      this.transitionTo("open")
    }
  }

  private transitionTo(next: CircuitBreakerState) {
    if (this.state === next) {
      return
    }
    this.state = next
    this.onTransition?.(next)
  }
}
