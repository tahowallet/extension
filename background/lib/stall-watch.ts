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
 * How long, in ms, the background's event loop can go without a turn before
 * it's considered stalled. Anything longer is noticeable in the UI, since UI
 * dispatches wait on the background.
 */
export const STALL_THRESHOLD_MS = 100

/**
 * How long, in ms, a stall has to be before it's logged on its own as soon as
 * it happens. Shorter stalls are summarized once a minute instead, so that
 * frequent small stalls don't flood the logs.
 */
export const LONG_STALL_MS = 250

/** How often, in ms, shorter stalls are summarized in the logs. */
const STALL_SUMMARY_INTERVAL_MS = 60_000

/** How many finished activities are kept for attributing stalls. */
const RECENT_ACTIVITY_LIMIT = 64

/** How many activities a stall summary names. */
const SUMMARY_TOP_COUNT = 3

/** Something the background was doing, for attributing stalls to it. */
type Activity = { label: string; startedAt: number; endedAt?: number }

const activeActivities = new Set<Activity>()
const recentActivities: Activity[] = []

/**
 * Records that the background has started on `label`, for example a thunk or
 * an alarm, and returns a function to call when it's done. While it runs, and
 * for a little while after, a stall that overlaps it names it as something
 * that was going on at the time.
 *
 * Labels should name kinds of work, like `thunk history/fetchValueHistory`,
 * not carry data, since they're reported to analytics.
 */
export function trackActivity(label: string): () => void {
  const activity: Activity = { label, startedAt: performance.now() }
  activeActivities.add(activity)
  return () => {
    activity.endedAt = performance.now()
    activeActivities.delete(activity)
    recentActivities.push(activity)
    if (recentActivities.length > RECENT_ACTIVITY_LIMIT) {
      recentActivities.shift()
    }
  }
}

/**
 * Records work that already happened, from `startedAt` until now, such as a
 * synchronous Redux dispatch that was timed after the fact.
 */
export function recordActivity(label: string, startedAt: number): void {
  const activity: Activity = { label, startedAt, endedAt: performance.now() }
  recentActivities.push(activity)
  if (recentActivities.length > RECENT_ACTIVITY_LIMIT) {
    recentActivities.shift()
  }
}

/**
 * Returns the labels of activities that overlapped the span from `from` to
 * `to`, each once, longest-overlapping first.
 */
function activitiesDuring(from: number, to: number): string[] {
  const overlaps = new Map<string, number>()
  const consider = ({ label, startedAt, endedAt = to }: Activity) => {
    const overlap = Math.min(endedAt, to) - Math.max(startedAt, from)
    if (overlap > 0) {
      overlaps.set(label, Math.max(overlaps.get(label) ?? 0, overlap))
    }
  }
  activeActivities.forEach(consider)
  recentActivities.forEach(consider)
  return [...overlaps.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([label]) => label)
}

/**
 * Runs a background thunk's work, logging a warning if it takes longer than
 * {@link SLOW_THUNK_MS} to finish and another if it's still running after
 * {@link HUNG_THUNK_MS}. Returns the work's result, or rethrows its error.
 *
 * The UI waits on background thunks it dispatches, so a thunk that never
 * finishes leaves the UI stuck with nothing in the logs to say why. The
 * still-running warning names the thunk that's holding things up. The thunk
 * is also tracked as an activity, so stalls while it runs name it.
 *
 * @param typePrefix The thunk's type prefix, used to name it in the logs.
 * @param run The thunk's work.
 */
export async function watchThunk<T>(
  typePrefix: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now()
  const done = trackActivity(`thunk ${typePrefix}`)
  const hung = setTimeout(() => {
    logger.warn(
      `Background thunk ${typePrefix} still running after ${HUNG_THUNK_MS / 1000}s.`,
    )
  }, HUNG_THUNK_MS)

  try {
    return await run()
  } finally {
    clearTimeout(hung)
    done()
    const elapsed = performance.now() - startedAt
    if (elapsed >= SLOW_THUNK_MS) {
      logger.warn(
        `Background thunk ${typePrefix} took ${Math.round(elapsed)}ms.`,
      )
    }
  }
}

/** An event loop stall, as reported to {@link onEventLoopStall} listeners. */
export type Stall = {
  /** About how long the event loop went without a turn, in ms. */
  durationMs: number
  /**
   * The tracked activities that overlapped the stall, longest-overlapping
   * first. Empty if nothing tracked was running, which points at work that
   * isn't tracked, or at the browser itself.
   */
  during: string[]
}

/** A listener for event loop stalls. */
export type StallListener = (stall: Stall) => void

const stallListeners = new Set<StallListener>()

/**
 * Registers a listener that's called with each stall {@link watchEventLoop}
 * notices, for example to report stalls to analytics. Returns a function that
 * removes the listener.
 */
export function onEventLoopStall(listener: StallListener): () => void {
  stallListeners.add(listener)
  return () => {
    stallListeners.delete(listener)
  }
}

/**
 * Collects shorter stalls between summaries: how many there were, the
 * longest, and how often each activity overlapped one.
 */
type StallSummary = {
  count: number
  longestMs: number
  untracked: number
  during: Map<string, number>
}

const freshSummary = (): StallSummary => ({
  count: 0,
  longestMs: 0,
  untracked: 0,
  during: new Map(),
})

/**
 * Returns the activities that overlapped stalls most often, as
 * `label ×count`, most frequent first.
 */
export function topActivities(
  during: Map<string, number>,
  count = SUMMARY_TOP_COUNT,
): string[] {
  return [...during.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([label, times]) => `${label} ×${times}`)
}

/**
 * Starts watching the service worker's event loop, notifying any
 * {@link onEventLoopStall} listeners whenever a check that should run every
 * `intervalMs` runs at least `thresholdMs` late. Returns a function that stops
 * watching.
 *
 * While the event loop is blocked, nothing else in the background runs: UI
 * dispatches, port messages and alarms all wait. A blocked event loop
 * therefore looks like a frozen UI, and the logs here are often the only sign
 * of what happened. Each stall is attributed to the tracked activities that
 * overlapped it, such as thunks, alarms and slow Redux actions.
 *
 * Stalls of {@link LONG_STALL_MS} or more are logged as warnings right away.
 * Shorter ones are summarized once a minute, with how many there were, the
 * longest, and what was most often running, so that frequent small stalls
 * don't flood the logs.
 *
 * Note that a stall is noticed after it ends, by the first check that manages
 * to run. Checks run often enough that a stall at the threshold can't fall
 * between two of them unnoticed.
 */
export function watchEventLoop({
  intervalMs = 25,
  thresholdMs = STALL_THRESHOLD_MS,
}: { intervalMs?: number; thresholdMs?: number } = {}): () => void {
  let last = performance.now()
  let summary = freshSummary()

  const timer = setInterval(() => {
    const now = performance.now()
    const late = now - last - intervalMs
    const stallStart = last
    last = now
    if (late < thresholdMs) return

    const stall: Stall = {
      durationMs: late,
      during: activitiesDuring(stallStart, now),
    }
    if (late >= LONG_STALL_MS) {
      logger.warn(
        `Background event loop was blocked for about ${Math.round(late)}ms${
          stall.during.length > 0
            ? ` during ${stall.during.join(", ")}`
            : ", with no tracked work running"
        }.`,
      )
    } else {
      summary.count += 1
      summary.longestMs = Math.max(summary.longestMs, late)
      if (stall.during.length === 0) summary.untracked += 1
      stall.during.forEach((label) =>
        summary.during.set(label, (summary.during.get(label) ?? 0) + 1),
      )
    }
    stallListeners.forEach((listener) => listener(stall))
  }, intervalMs)

  const summaryTimer = setInterval(() => {
    if (summary.count === 0) return
    const { count, longestMs, untracked, during } = summary
    summary = freshSummary()
    const top = topActivities(during)
    logger.info(
      `Background event loop stalled ${count} times for ${thresholdMs}-${LONG_STALL_MS}ms in the last minute, at most ${Math.round(longestMs)}ms. ${
        top.length > 0 ? `Most often during: ${top.join(", ")}.` : ""
      }${untracked > 0 ? ` ${untracked} with no tracked work running.` : ""}`.trim(),
    )
  }, STALL_SUMMARY_INTERVAL_MS)

  return () => {
    clearInterval(timer)
    clearInterval(summaryTimer)
  }
}
