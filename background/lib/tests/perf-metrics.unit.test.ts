import {
  recordCircuitBreakerTransition,
  recordReconnectAttempt,
  recordReconnectFailed,
  recordReconnectSucceeded,
  recordRequestFailed,
  recordRequestSent,
  recordRequestSucceeded,
  recordSingleFlightCoalesce,
  resetForTests,
  snapshotAndReset,
} from "../perf-metrics"

describe("perf-metrics", () => {
  beforeEach(() => {
    resetForTests()
  })

  it("returns an empty snapshot when no events have been recorded", () => {
    const snapshot = snapshotAndReset()
    expect(snapshot.chains).toEqual({})
  })

  it("aggregates counters per chain and per provider index", () => {
    recordRequestSent("1", 0)
    recordRequestSent("1", 0)
    recordRequestSent("1", 1)
    recordRequestSent("10", 0)

    recordRequestSucceeded("1", 0, 30)
    recordRequestSucceeded("1", 0, 300)
    recordRequestFailed("1", 1, "rate-limit-error")
    recordSingleFlightCoalesce("1", 0)
    recordReconnectAttempt("1", 1)
    recordReconnectSucceeded("1", 1)
    recordReconnectFailed("1", 1)
    recordCircuitBreakerTransition("1", 1, "open")
    recordCircuitBreakerTransition("1", 1, "half-open")
    recordCircuitBreakerTransition("1", 1, "closed")

    const snapshot = snapshotAndReset()

    expect(Object.keys(snapshot.chains).sort()).toEqual(["1", "10"])
    const ethProviders = snapshot.chains["1"].providers
    const primary = ethProviders.find((p) => p.providerIndex === 0)!
    const secondary = ethProviders.find((p) => p.providerIndex === 1)!

    expect(primary.requestsSent).toBe(2)
    expect(primary.requestsSucceeded).toBe(2)
    expect(primary.singleFlightCoalesces).toBe(1)
    // 30ms falls into le_50, 300ms into le_500
    expect(primary.durationHistogramMs.le_50).toBe(1)
    expect(primary.durationHistogramMs.le_500).toBe(1)

    expect(secondary.requestsSent).toBe(1)
    expect(secondary.requestsFailed["rate-limit-error"]).toBe(1)
    expect(secondary.reconnectAttempts).toBe(1)
    expect(secondary.reconnectSuccesses).toBe(1)
    expect(secondary.reconnectFailures).toBe(1)
    expect(secondary.circuitBreakerOpens).toBe(1)
    expect(secondary.circuitBreakerHalfOpens).toBe(1)
    expect(secondary.circuitBreakerCloses).toBe(1)
  })

  it("places durations larger than the largest bucket in overflow", () => {
    recordRequestSent("1", 0)
    recordRequestSucceeded("1", 0, 30_000)

    const snapshot = snapshotAndReset()
    const primary = snapshot.chains["1"].providers[0]
    expect(primary.durationHistogramMs.overflow).toBe(1)
  })

  it("resets counters after snapshot so the next window starts clean", () => {
    recordRequestSent("1", 0)
    const first = snapshotAndReset()
    expect(first.chains["1"].providers[0].requestsSent).toBe(1)

    const second = snapshotAndReset()
    expect(second.chains).toEqual({})
    expect(second.windowStartedAt).toBeGreaterThanOrEqual(first.takenAt)
  })

  it("sorts providers by index within a chain", () => {
    recordRequestSent("1", 2)
    recordRequestSent("1", 0)
    recordRequestSent("1", 1)

    const snapshot = snapshotAndReset()
    expect(snapshot.chains["1"].providers.map((p) => p.providerIndex)).toEqual([
      0, 1, 2,
    ])
  })
})
