import logger from "./logger"

/**
 * How long, in ms, a background thunk can run before it's logged as slow when
 * it finishes.
 */
export const SLOW_THUNK_MS = 2_000

/**
 * How long, in ms, a background thunk can run before it's logged as still
 * running, without waiting for it to finish.
 */
export const HUNG_THUNK_MS = 15_000

/**
 * Runs a background thunk's work, logging a warning if it takes longer than
 * {@link SLOW_THUNK_MS} to finish and another if it's still running after
 * {@link HUNG_THUNK_MS}. Returns the work's result, or rethrows its error.
 *
 * The UI waits on background thunks it dispatches, so a thunk that never
 * finishes leaves the UI stuck with nothing in the logs to say why. The
 * still-running warning names the thunk that's holding things up.
 *
 * @param typePrefix The thunk's type prefix, used to name it in the logs.
 * @param run The thunk's work.
 */
export async function watchThunk<T>(
  typePrefix: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now()
  const hung = setTimeout(() => {
    logger.warn(
      `Background thunk ${typePrefix} still running after ${HUNG_THUNK_MS / 1000}s.`,
    )
  }, HUNG_THUNK_MS)

  try {
    return await run()
  } finally {
    clearTimeout(hung)
    const elapsed = performance.now() - startedAt
    if (elapsed >= SLOW_THUNK_MS) {
      logger.warn(
        `Background thunk ${typePrefix} took ${Math.round(elapsed)}ms.`,
      )
    }
  }
}

/**
 * How long, in ms, the background's event loop can go without a turn before
 * it's considered stalled. Anything longer is noticeable in the UI, since UI
 * dispatches wait on the background.
 */
export const STALL_THRESHOLD_MS = 100

/** A listener for event loop stalls, given each stall's duration in ms. */
export type StallListener = (durationMs: number) => void

const stallListeners = new Set<StallListener>()

/**
 * Registers a listener that's called with the duration of each event loop
 * stall {@link watchEventLoop} notices, for example to report stalls to
 * analytics. Returns a function that removes the listener.
 */
export function onEventLoopStall(listener: StallListener): () => void {
  stallListeners.add(listener)
  return () => {
    stallListeners.delete(listener)
  }
}

/**
 * Starts watching the service worker's event loop, logging a warning and
 * notifying any {@link onEventLoopStall} listeners whenever a check that
 * should run every `intervalMs` runs at least `thresholdMs` late. Returns a
 * function that stops watching.
 *
 * While the event loop is blocked, nothing else in the background runs: UI
 * dispatches, port messages and alarms all wait. A blocked event loop
 * therefore looks like a frozen UI, and this warning is often the only sign of
 * what happened.
 *
 * Note that the warning comes after the stall, from the first check that
 * manages to run; whatever was logged just before it is usually the cause.
 * Checks run often enough that a stall at the threshold can't fall between
 * two of them unnoticed.
 */
export function watchEventLoop({
  intervalMs = 25,
  thresholdMs = STALL_THRESHOLD_MS,
}: { intervalMs?: number; thresholdMs?: number } = {}): () => void {
  let last = performance.now()
  const timer = setInterval(() => {
    const now = performance.now()
    const late = now - last - intervalMs
    last = now
    if (late >= thresholdMs) {
      logger.warn(
        `Background event loop was blocked for about ${Math.round(late)}ms.`,
      )
      stallListeners.forEach((listener) => listener(late))
    }
  }, intervalMs)
  return () => clearInterval(timer)
}
