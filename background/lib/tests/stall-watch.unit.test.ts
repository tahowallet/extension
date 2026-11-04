import { afterEach, describe, expect, it, jest, spyOn } from "bun:test"

import logger from "../logger"
import {
  HUNG_THUNK_MS,
  SLOW_THUNK_MS,
  onEventLoopStall,
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
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("warns when a tick comes late", () => {
    jest.useFakeTimers()
    const warn = spyOn(logger, "warn").mockImplementation(() => {})
    let now = 0
    spyOn(performance, "now").mockImplementation(() => now)

    const stop = watchEventLoop({ intervalMs: 1_000, thresholdMs: 500 })
    now = 1_100
    jest.advanceTimersByTime(1_000)
    expect(warn).not.toHaveBeenCalled()

    now = 3_100
    jest.advanceTimersByTime(1_000)
    expect(warn).toHaveBeenCalledWith(
      "Background event loop was blocked for about 1000ms.",
    )
    stop()
  })

  it("tells stall listeners how long the loop was blocked", () => {
    jest.useFakeTimers()
    spyOn(logger, "warn").mockImplementation(() => {})
    let now = 0
    spyOn(performance, "now").mockImplementation(() => now)
    const stalls: number[] = []
    const stopListening = onEventLoopStall((durationMs) =>
      stalls.push(durationMs),
    )

    const stop = watchEventLoop({ intervalMs: 25, thresholdMs: 100 })
    now = 30
    jest.advanceTimersByTime(25)
    now = 180
    jest.advanceTimersByTime(25)
    expect(stalls).toEqual([125])

    stopListening()
    now = 400
    jest.advanceTimersByTime(25)
    expect(stalls).toEqual([125])
    stop()
  })
})
