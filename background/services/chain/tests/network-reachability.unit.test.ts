import {
  NetworkReachabilityState,
  NetworkReachabilityTracker,
} from "../network-reachability"

const START = 1_700_000_000_000
const FLOOR_MS = 45_000

/**
 * A tracker on a clock the test drives, alongside the list of states it has
 * reported. Reporting is what the rest of the extension actually observes, so
 * the tests assert on the list rather than only on `getState()`.
 */
function trackerOnATestClock() {
  const reported: NetworkReachabilityState[] = []
  let currentTime = START

  const tracker = new NetworkReachabilityTracker(
    {},
    (next) => reported.push(next),
    () => currentTime,
  )

  return {
    tracker,
    reported,
    advance: (ms: number) => {
      currentTime += ms
    },
  }
}

describe("NetworkReachabilityTracker", () => {
  it("starts out reachable and says nothing about it", () => {
    const { tracker, reported } = trackerOnATestClock()

    expect(tracker.getState()).toBe("reachable")
    expect(reported).toEqual([])
  })

  it("holds reachable through a single exhausted walk, however old the last success", () => {
    const { tracker, reported, advance } = trackerOnATestClock()

    advance(FLOOR_MS * 10)
    tracker.recordExhaustedWalk()

    expect(tracker.getState()).toBe("reachable")
    expect(reported).toEqual([])
  })

  it("holds reachable through repeated exhausted walks inside the floor", () => {
    const { tracker, reported, advance } = trackerOnATestClock()

    for (let i = 0; i < 5; i += 1) {
      advance(FLOOR_MS / 10)
      tracker.recordExhaustedWalk()
    }

    expect(tracker.getState()).toBe("reachable")
    expect(reported).toEqual([])
  })

  it("reports unreachable once two walks have exhausted past the floor", () => {
    const { tracker, reported, advance } = trackerOnATestClock()

    tracker.recordExhaustedWalk()
    advance(FLOOR_MS)
    tracker.recordExhaustedWalk()

    expect(tracker.getState()).toBe("unreachable")
    expect(reported).toEqual(["unreachable"])
  })

  it("reports unreachable once, not once per failed call", () => {
    const { tracker, reported, advance } = trackerOnATestClock()

    tracker.recordExhaustedWalk()
    advance(FLOOR_MS)
    for (let i = 0; i < 20; i += 1) {
      tracker.recordExhaustedWalk()
    }

    expect(reported).toEqual(["unreachable"])
  })

  it("returns to reachable on the first success, without waiting out a floor", () => {
    const { tracker, reported, advance } = trackerOnATestClock()

    tracker.recordExhaustedWalk()
    advance(FLOOR_MS)
    tracker.recordExhaustedWalk()
    tracker.recordSuccess()

    expect(tracker.getState()).toBe("reachable")
    expect(reported).toEqual(["unreachable", "reachable"])
  })

  it("makes a recovered network earn its way back to unreachable", () => {
    const { tracker, reported, advance } = trackerOnATestClock()

    tracker.recordExhaustedWalk()
    advance(FLOOR_MS)
    tracker.recordExhaustedWalk()
    tracker.recordSuccess()

    // A success clears the walk count as well as the clock, so the very next
    // exhausted walk is a first walk again no matter how much time passes.
    advance(FLOOR_MS * 10)
    tracker.recordExhaustedWalk()

    expect(tracker.getState()).toBe("reachable")
    expect(reported).toEqual(["unreachable", "reachable"])
  })

  it("says nothing when a success lands on an already-reachable network", () => {
    const { tracker, reported } = trackerOnATestClock()

    tracker.recordSuccess()
    tracker.recordSuccess()

    expect(reported).toEqual([])
  })

  it("honors a caller-supplied threshold and floor", () => {
    const reported: NetworkReachabilityState[] = []
    let currentTime = START
    const tracker = new NetworkReachabilityTracker(
      { exhaustedWalkThreshold: 3, successFloorMs: 1_000 },
      (next) => reported.push(next),
      () => currentTime,
    )

    currentTime += 5_000
    tracker.recordExhaustedWalk()
    tracker.recordExhaustedWalk()
    expect(tracker.getState()).toBe("reachable")

    tracker.recordExhaustedWalk()
    expect(tracker.getState()).toBe("unreachable")
  })
})
