import { CircuitBreaker, CircuitBreakerState } from "../circuit-breaker"

describe("CircuitBreaker", () => {
  let currentTime: number
  const now = () => currentTime
  const advance = (ms: number) => {
    currentTime += ms
  }

  beforeEach(() => {
    currentTime = 1_000_000
  })

  it("starts closed and allows requests through", () => {
    const breaker = new CircuitBreaker({}, undefined, now)
    expect(breaker.getState()).toBe("closed")
    expect(breaker.canRequest()).toBe(true)
    expect(breaker.canRequest()).toBe(true)
  })

  it("trips open when the failure threshold is reached within the window", () => {
    const transitions: CircuitBreakerState[] = []
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, failureWindowMs: 1_000 },
      (next) => transitions.push(next),
      now,
    )

    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.getState()).toBe("closed")
    breaker.recordFailure()

    expect(breaker.getState()).toBe("open")
    expect(breaker.canRequest()).toBe(false)
    expect(transitions).toEqual(["open"])
  })

  it("does not trip open when failures fall outside the rolling window", () => {
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, failureWindowMs: 1_000 },
      undefined,
      now,
    )

    breaker.recordFailure()
    advance(2_000)
    breaker.recordFailure()
    advance(2_000)
    breaker.recordFailure()

    expect(breaker.getState()).toBe("closed")
  })

  it("transitions to half-open and allows exactly one probe after cooldown", () => {
    const transitions: CircuitBreakerState[] = []
    const breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        failureWindowMs: 1_000,
        initialCooldownMs: 500,
      },
      (next) => transitions.push(next),
      now,
    )

    breaker.recordFailure()
    expect(breaker.getState()).toBe("open")
    expect(breaker.canRequest()).toBe(false)

    advance(500)
    // First canRequest after cooldown elapses transitions to half-open and
    // releases the probe.
    expect(breaker.canRequest()).toBe(true)
    expect(breaker.getState()).toBe("half-open")
    // A second caller while the probe is in-flight is rejected.
    expect(breaker.canRequest()).toBe(false)
    expect(transitions).toEqual(["open", "half-open"])
  })

  it("closes on a successful half-open probe and resets cooldown", () => {
    const transitions: CircuitBreakerState[] = []
    const breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        failureWindowMs: 1_000,
        initialCooldownMs: 500,
        maxCooldownMs: 10_000,
        cooldownBackoffMultiplier: 2,
      },
      (next) => transitions.push(next),
      now,
    )

    breaker.recordFailure()
    advance(500)
    expect(breaker.canRequest()).toBe(true)
    breaker.recordSuccess()

    expect(breaker.getState()).toBe("closed")
    expect(breaker.canRequest()).toBe(true)
    expect(transitions).toEqual(["open", "half-open", "closed"])
  })

  it("re-opens with a longer cooldown when the probe fails", () => {
    const transitions: CircuitBreakerState[] = []
    const breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        failureWindowMs: 1_000,
        initialCooldownMs: 500,
        maxCooldownMs: 10_000,
        cooldownBackoffMultiplier: 2,
      },
      (next) => transitions.push(next),
      now,
    )

    breaker.recordFailure()
    advance(500)
    expect(breaker.canRequest()).toBe(true)
    breaker.recordFailure()

    // Should now be open again, with doubled cooldown (1_000 ms).
    expect(breaker.getState()).toBe("open")
    advance(500)
    expect(breaker.canRequest()).toBe(false)
    advance(500)
    expect(breaker.canRequest()).toBe(true)

    expect(transitions).toEqual(["open", "half-open", "open", "half-open"])
  })

  it("caps exponential cooldown at maxCooldownMs", () => {
    const breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        failureWindowMs: 1_000,
        initialCooldownMs: 1_000,
        maxCooldownMs: 2_000,
        cooldownBackoffMultiplier: 10,
      },
      undefined,
      now,
    )

    breaker.recordFailure()
    advance(1_000)
    breaker.canRequest()
    breaker.recordFailure()

    // Cooldown would be 10x (= 10_000) but is capped at 2_000.
    advance(1_999)
    expect(breaker.canRequest()).toBe(false)
    advance(1)
    expect(breaker.canRequest()).toBe(true)
  })

  it("ignores stray failures while fully open without extending the cooldown", () => {
    const breaker = new CircuitBreaker(
      {
        failureThreshold: 1,
        failureWindowMs: 1_000,
        initialCooldownMs: 500,
      },
      undefined,
      now,
    )

    breaker.recordFailure()
    advance(100)
    breaker.recordFailure()
    breaker.recordFailure()
    advance(400)
    // Cooldown should still elapse at 500ms from the original open.
    expect(breaker.canRequest()).toBe(true)
  })

  it("resets the failure window on a success while closed", () => {
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, failureWindowMs: 60_000 },
      undefined,
      now,
    )

    breaker.recordFailure()
    breaker.recordFailure()
    breaker.recordSuccess()
    breaker.recordFailure()
    breaker.recordFailure()
    expect(breaker.getState()).toBe("closed")
  })
})
