import { DAY, HOUR } from "../../constants"
import { expectedSpacingForAge } from "./compaction"

/** How far back backfill reaches, currently two years. */
export const BACKFILL_HORIZON = 2 * 365 * DAY

/**
 * How far back from the present backfill starts. History more recent than
 * this is left to live updates.
 */
export const BACKFILL_SETTLE = 2 * HOUR

/**
 * A span of history, starting at `start` and lasting `size` milliseconds, in
 * which backfill wants a point.
 */
export type Bucket = { start: number; size: number }

/**
 * Returns the backfill bucket that `time` falls in, given its age as of
 * `now`. Buckets are sized by {@link expectedSpacingForAge}, so they match
 * what compaction would keep.
 */
export function bucketAt(time: number, now: number): Bucket {
  const size = expectedSpacingForAge(now - time)
  return { start: Math.floor(time / size) * size, size }
}

/**
 * Checks whether any of `sortedTimes`, which must be sorted oldest first,
 * fall within `[from, to)`.
 */
function anyWithin(
  sortedTimes: ArrayLike<number>,
  from: number,
  to: number,
): boolean {
  let low = 0
  let high = sortedTimes.length
  // Binary search for the index of the first time at or after `from`.
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (sortedTimes[mid] < from) low = mid + 1
    else high = mid
  }
  return low < sortedTimes.length && sortedTimes[low] < to
}

/**
 * Returns the buckets in which a series has no point, newest first, starting
 * {@link BACKFILL_SETTLE} before `now` and going back to the backfill horizon
 * or to `floor`, whichever is later. If `limit` is passed, at most that many
 * buckets are returned.
 *
 * Buckets follow the retention tiers, so a series is filled hourly for the
 * last week, daily out to three months, and weekly beyond that. Backfill
 * never fills a series more finely than compaction would keep it.
 *
 * Ordering newest first means backfill finishes the recent past, where gaps
 * are most noticeable, before it reaches further back. It also means that an
 * infill gap, for example from a night the wallet was closed, is filled
 * before another week of older history.
 */
export function missingBuckets(
  times: ArrayLike<number>,
  now: number,
  { floor, limit = Infinity }: { floor?: number; limit?: number } = {},
): Bucket[] {
  const sorted = Float64Array.from(times).sort()
  const earliest = Math.max(now - BACKFILL_HORIZON, floor ?? -Infinity)
  const missing: Bucket[] = []

  let time = now - BACKFILL_SETTLE
  while (time >= earliest && missing.length < limit) {
    const bucket = bucketAt(time, now)
    if (
      bucket.start >= earliest &&
      !anyWithin(sorted, bucket.start, bucket.start + bucket.size)
    ) {
      missing.push(bucket)
    }
    time = bucket.start - 1
  }

  return missing
}
