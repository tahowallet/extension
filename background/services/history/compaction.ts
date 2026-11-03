import { DAY, HOUR, MINUTE } from "../../constants"

/**
 * Retention tiers describe how finely history is kept as it ages, following
 * the retention plan in issue #214: one point every five minutes for the
 * latest day, then one an hour for a week, one a day for three months, and
 * one a week after that.
 *
 * Note that #214 kept every point for the latest day. However, prices arrive
 * every minute for every tracked asset, which is far more than a chart can
 * show, so the latest day is kept at five-minute resolution instead.
 *
 * Each tier gives the age at which it starts and the bucket size that points
 * in it are collapsed to. A bucket size of 0 keeps every point.
 */
export const RETENTION_TIERS: readonly { fromAge: number; bucket: number }[] = [
  { fromAge: 0, bucket: 5 * MINUTE },
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
 * Returns the spacing that history of the given age is expected to have once
 * compacted, which is the spacing backfill fills to. Recent history is
 * expected hourly even though it is kept at a finer resolution, since hourly
 * points are what backfill sources provide.
 */
export function expectedSpacingForAge(age: number): number {
  return Math.max(bucketSizeForAge(age), HOUR)
}
