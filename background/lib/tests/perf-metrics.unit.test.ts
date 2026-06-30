import {
  recordCircuitBreakerTransition,
  recordReconnectAttempt,
  recordReconnectFailed,
  recordReconnectSucceeded,
  recordReduxDiff,
  recordReduxPersist,
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

  describe("redux counters", () => {
    it("omits the redux key entirely when no observations have been recorded", () => {
      const snapshot = snapshotAndReset()
      expect(snapshot.redux).toBeUndefined()
    })

    it("aggregates persist duration and bytes with running count, sum, and max", () => {
      recordReduxPersist(40, 1_000)
      recordReduxPersist(120, 2_000)
      recordReduxPersist(60, 3_500)

      const snapshot = snapshotAndReset()
      const { persist } = snapshot.redux!
      expect(persist.duration).toEqual({ count: 3, sum: 220, max: 120 })
      expect(persist.bytes).toEqual({ count: 3, sum: 6_500, max: 3_500 })
      expect(persist.durationHistogramMs.le_50).toBe(1)
      expect(persist.durationHistogramMs.le_200).toBe(2)
    })

    it("aggregates diff durations independently of persist", () => {
      recordReduxDiff(15)
      recordReduxDiff(300)

      const snapshot = snapshotAndReset()
      expect(snapshot.redux!.diff.duration).toEqual({
        count: 2,
        sum: 315,
        max: 300,
      })
      expect(snapshot.redux!.persist.duration.count).toBe(0)
    })

    it("resets redux counters after a snapshot", () => {
      recordReduxPersist(10, 100)
      recordReduxDiff(5)
      snapshotAndReset()
      const second = snapshotAndReset()
      expect(second.redux).toBeUndefined()
    })
  })
})
