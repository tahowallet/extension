import { afterEach, describe, expect, it, jest, spyOn } from "bun:test"

import logger from "../logger"
import {
  HUNG_THUNK_MS,
  recordActivity,
  SLOW_THUNK_MS,
  Stall,
  onEventLoopStall,
  trackActivity,
  watchEventLoop,
  watchThunk,
} from "../stall-watch"

describe("watchThunk", () => {
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("stays quiet for quick work and passes its result through", async () => {
    const warn = spyOn(logger, "warn").mockImplementation(() => {})
    expect(await watchThunk("test/quick", async () => 42)).toBe(42)
    expect(warn).not.toHaveBeenCalled()
  })

  it("warns when work is slow, and passes errors through", async () => {
    const warn = spyOn(logger, "warn").mockImplementation(() => {})
    let now = 0
    spyOn(performance, "now").mockImplementation(() => now)

    await expect(
      watchThunk("test/slow", async () => {
        now += SLOW_THUNK_MS + 1
        throw new Error("boom")
      }),
    ).rejects.toThrow("boom")
    expect(warn).toHaveBeenCalledWith(
      `Background thunk test/slow took ${SLOW_THUNK_MS + 1}ms.`,
    )
  })

  it("warns while work is still running", async () => {
    jest.useFakeTimers()
    const warn = spyOn(logger, "warn").mockImplementation(() => {})
    let finish: () => void = () => {}
    const running = watchThunk(
      "test/hung",
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )

    jest.advanceTimersByTime(HUNG_THUNK_MS)
    expect(warn).toHaveBeenCalledWith(
      `Background thunk test/hung still running after ${HUNG_THUNK_MS / 1000}s.`,
    )
    finish()
    await running
  })
})

describe("watchEventLoop", () => {
  let now: number

  beforeEach(() => {
    jest.useFakeTimers()
    now = 0
    spyOn(performance, "now").mockImplementation(() => now)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  /** Lets one check run, `late` ms after it was due. */
  const tick = (late = 0) => {
    now += 25 + late
    jest.advanceTimersByTime(25)
  }

  it("warns right away about a long stall, naming what was running", () => {
    const warn = spyOn(logger, "warn").mockImplementation(() => {})
    const stop = watchEventLoop({ intervalMs: 25, thresholdMs: 100 })

    const done = trackActivity("thunk test/slow")
    tick(300)
    done()
    expect(warn).toHaveBeenCalledWith(
      "Background event loop was blocked for about 300ms during thunk test/slow.",
    )

    tick(400)
    expect(warn).toHaveBeenLastCalledWith(
      "Background event loop was blocked for about 400ms, with no tracked work running.",
    )
    stop()
  })

  it("summarizes shorter stalls once a minute instead", () => {
    const warn = spyOn(logger, "warn").mockImplementation(() => {})
    const info = spyOn(logger, "info").mockImplementation(() => {})
    const stop = watchEventLoop({ intervalMs: 25, thresholdMs: 100 })

    const startedAt = performance.now()
    tick(120)
    recordActivity("action ui/slow", startedAt)
    tick(150)
    tick(110)
    expect(warn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(60_000)
    expect(info).toHaveBeenCalledTimes(1)
    const [message] = info.mock.calls[0] as [string]
    expect(message).toContain("stalled 3 times")
    expect(message).toContain("at most 150ms")
    expect(message).toContain("action ui/slow ×1")
    expect(message).toContain("2 with no tracked work running")

    // A quiet minute logs nothing.
    jest.advanceTimersByTime(60_000)
    expect(info).toHaveBeenCalledTimes(1)
    stop()
  })

  it("tells stall listeners about every stall", () => {
    spyOn(logger, "warn").mockImplementation(() => {})
    const stalls: Stall[] = []
    const stopListening = onEventLoopStall((stall) => stalls.push(stall))
    const stop = watchEventLoop({ intervalMs: 25, thresholdMs: 100 })

    tick(5)
    const done = trackActivity("alarm test")
    tick(125)
    done()
    expect(stalls).toEqual([{ durationMs: 125, during: ["alarm test"] }])

    stopListening()
    tick(200)
    expect(stalls).toHaveLength(1)
    stop()
  })
})
