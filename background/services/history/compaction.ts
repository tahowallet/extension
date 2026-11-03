import { DAY, HOUR } from "../../constants"

/**
 * How finely history is kept as it ages, after the retention plan in issue
 * #214: every point for the latest day, then one an hour for a week, one a
 * day for three months, and one a week after that.
 *
 * Each tier gives the age it starts at and the bucket size points in it
 * collapse to. A bucket size of 0 keeps every point.
 */
export const RETENTION_TIERS: readonly { fromAge: number; bucket: number }[] = [
  { fromAge: 0, bucket: 0 },
  { fromAge: DAY, bucket: HOUR },
  { fromAge: 7 * DAY, bucket: DAY },
  { fromAge: 90 * DAY, bucket: 7 * DAY },
]

/** Returns the bucket size that points of the given age are kept at. */
export function bucketSizeForAge(age: number): number {
  let size = 0
  RETENTION_TIERS.forEach(({ fromAge, bucket }) => {
    if (age >= fromAge) size = bucket
  })
  return size
}

/**
 * Given the times of one series' points, in any order, returns the indexes of
 * the points that compaction can drop: all but the latest point in each
 * bucket of the points' retention tier.
 *
 * The latest point is the one kept so that step functions, such as balances,
 * still have the right value at the end of each bucket.
 */
export function compactableIndexes(times: number[], now: number): number[] {
  const latestByBucket = new Map<string, number>()
  const bucketOf = times.map((time, index) => {
    const size = bucketSizeForAge(now - time)
    if (size === 0) return null
    const key = `${size}:${Math.floor(time / size)}`
    const kept = latestByBucket.get(key)
    if (kept === undefined || times[kept] <= time) {
      latestByBucket.set(key, index)
    }
    return key
  })

  return bucketOf.flatMap((key, index) =>
    key !== null && latestByBucket.get(key) !== index ? [index] : [],
  )
}

/**
 * The spacing history is expected to have at a given age once compacted,
 * for finding gaps worth infilling. Recent history is expected hourly even
 * though it is kept finer, since that is what backfill sources provide.
 */
export function expectedSpacingForAge(age: number): number {
  return Math.max(bucketSizeForAge(age), HOUR)
}

/**
 * Finds stretches between `from` and `to` with no point for longer than the
 * expected spacing at their age, so they can be infilled. Returns the gaps
 * newest first, since recent history matters most.
 */
export function findGaps(
  times: number[],
  from: number,
  to: number,
  now: number,
): { from: number; to: number }[] {
  const sorted = [...times]
    .filter((time) => time >= from && time <= to)
    .sort((a, b) => a - b)
  const edges = [from, ...sorted, to]
  const gaps: { from: number; to: number }[] = []

  for (let i = 1; i < edges.length; i += 1) {
    const start = edges[i - 1]
    const end = edges[i]
    // Judge a gap by the coarser spacing of its older end.
    const allowed = expectedSpacingForAge(now - start) * 1.5
    if (end - start > allowed) gaps.push({ from: start, to: end })
  }

  return gaps.reverse()
}
