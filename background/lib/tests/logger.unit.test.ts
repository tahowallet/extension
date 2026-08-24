import browser from "webextension-polyfill"
import {
  FLUSH_DEBOUNCE_MS,
  FLUSH_THRESHOLD_CHARACTERS,
  Logger,
  MAX_LOG_CHARACTERS,
} from "../logger"

// The underlying mock storage backing `browser.storage.local`, courtesy of
// jest-webextension-mock (see setup-extension-mock.ts). We assert against
// this directly rather than spying on `browser.storage.local.set`, since the
// latter is a memoized wrapper the webextension-polyfill Proxy generates
// around this mock.
const storageSetMock = chrome.storage.local.set as jest.Mock

async function getStoredLevel(level: string): Promise<string | undefined> {
  const key = `logs-${level}`
  const result = await browser.storage.local.get(key)
  return result[key] as string | undefined
}

describe("Logger", () => {
  beforeEach(async () => {
    jest.useFakeTimers()
    await browser.storage.local.clear()
    storageSetMock.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test("batches rapid non-error log lines into a single storage.set after the debounce window", async () => {
    const logger = new Logger("TEST")

    // Kept small enough (each line's persisted entry includes a full stack
    // trace, which is quite long under Jest) that the total stays well
    // under FLUSH_THRESHOLD_CHARACTERS — this test is about the debounce
    // trigger specifically, not the threshold trigger (see the next test).
    const lineCount = 3
    for (let i = 0; i < lineCount; i += 1) {
      logger.debug(`line ${i}`)
    }

    // Let the lazy initial cache load and all the synchronous appends that
    // were waiting on it settle, without advancing the debounce clock.
    await jest.advanceTimersByTimeAsync(0)
    expect(storageSetMock).not.toHaveBeenCalled()

    // Nothing more happens until the trailing debounce elapses.
    await jest.advanceTimersByTimeAsync(FLUSH_DEBOUNCE_MS)

    expect(storageSetMock).toHaveBeenCalledTimes(1)
    const [payload] = storageSetMock.mock.calls[0]
    expect(Object.keys(payload)).toEqual(["logs-debug"])
    expect(payload["logs-debug"]).toContain("line 0")
    expect(payload["logs-debug"]).toContain(`line ${lineCount - 1}`)
  })

  test("flushes immediately once buffered data crosses the threshold, without waiting for the debounce", async () => {
    const logger = new Logger("TEST")

    const halfThreshold = Math.floor(FLUSH_THRESHOLD_CHARACTERS / 2)

    logger.warn("a".repeat(halfThreshold - 100))
    await jest.advanceTimersByTimeAsync(0)
    expect(storageSetMock).not.toHaveBeenCalled()

    logger.warn("b".repeat(halfThreshold + 500))
    await jest.advanceTimersByTimeAsync(0)

    expect(storageSetMock).toHaveBeenCalledTimes(1)
    const [payload] = storageSetMock.mock.calls[0]
    expect(Object.keys(payload)).toEqual(["logs-warn"])
  })

  test("flushes error logs immediately, bypassing the debounce/threshold buffering entirely", async () => {
    const logger = new Logger("TEST")

    logger.error("boom")
    await jest.advanceTimersByTimeAsync(0)

    expect(storageSetMock).toHaveBeenCalledTimes(1)
    const [payload] = storageSetMock.mock.calls[0]
    expect(Object.keys(payload)).toEqual(["logs-error"])
    expect(payload["logs-error"]).toContain("boom")
  })

  test("opportunistically coalesces another dirty level into an error's immediate flush", async () => {
    const logger = new Logger("TEST")

    logger.debug("still buffered")
    await jest.advanceTimersByTimeAsync(0)
    expect(storageSetMock).not.toHaveBeenCalled()

    logger.error("boom")
    await jest.advanceTimersByTimeAsync(0)

    expect(storageSetMock).toHaveBeenCalledTimes(1)
    const [payload] = storageSetMock.mock.calls[0]
    expect(Object.keys(payload).sort()).toEqual(["logs-debug", "logs-error"])
  })

  test("caps each level's persisted blob at 50,000 characters across multiple flushes", async () => {
    const logger = new Logger("TEST")

    // Error logs flush immediately, so this drives many separate
    // storage.set round-trips, well past the 50k cap in total.
    for (let i = 0; i < 40; i += 1) {
      logger.error(`line ${i} ${"y".repeat(2000)}`)
      // eslint-disable-next-line no-await-in-loop
      await jest.advanceTimersByTimeAsync(0)
    }

    expect(storageSetMock.mock.calls.length).toBeGreaterThan(1)

    const stored = await getStoredLevel("error")
    expect(stored).toBeDefined()
    expect((stored as string).length).toBeLessThanOrEqual(MAX_LOG_CHARACTERS)
    // The cap should have actually kicked in, i.e. we produced more than
    // 50k characters of logs across the run.
    expect((stored as string).length).toBe(MAX_LOG_CHARACTERS)
  })

  test("keeps the persisted blob format parseable by serializeLogs", async () => {
    const logger = new Logger("TEST")

    logger.warn("a warning message")
    logger.error("an error message")

    // Let both calls' fire-and-forget saveLog chains actually run (append
    // to their in-memory caches, and for the error, flush) before reading
    // logs back out — otherwise we'd just be racing our own unawaited log
    // calls, which isn't what this test is about.
    await jest.advanceTimersByTimeAsync(0)

    // The error already flushed above; the warn is still only buffered in
    // memory. serializeLogs should flush it and still see both.
    const serialized = await logger.serializeLogs()

    expect(serialized).toContain("a warning message")
    expect(serialized).toContain("an error message")
    expect(serialized).toMatch(
      /\[\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})\] \[WARN:TEST\]/,
    )
    expect(serialized).toMatch(
      /\[\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})\] \[ERROR:TEST\]/,
    )

    // serializeLogs flushing on read should also have persisted the warn
    // line, so a second, independent Logger reading storage sees it too.
    const stored = await getStoredLevel("warn")
    expect(stored).toContain("a warning message")
  })
})
