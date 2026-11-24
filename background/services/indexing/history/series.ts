import { expectedSpacingForAge } from "./compaction"

/** A point in a series of measurements. */
export type HistoryPoint = { time: number; value: number }

/**
 * A series of measurements, as parallel lists of times and values sorted
 * oldest first. Series are stored this way, rather than as a list of points,
 * so that they can be kept in typed arrays.
 */
export type Series = {
  times: ArrayLike<number>
  values: ArrayLike<number>
  /**
   * How each point was obtained, as stored by the indexing database; see
   * `ORIGIN_CODES`. Optional, since only balance series charts read it.
   */
  origins?: ArrayLike<number>
}

/**
 * How many times history's expected spacing at a sample's age a price can be
 * before the sample counts as unrecorded: twice, so a single missed point
 * doesn't count, but a wallet that wasn't running does.
 */
const STALE_SPACINGS = 2

/** The stored code for points reconstructed from transfers. */
const RECONSTRUCTED_ORIGIN = 2

/**
 * Returns when the given balance series were first held: the earliest point
 * among them whose balance isn't zero. For a series whose recorded history
 * starts with a balance, that's where its history starts. Before this
 * time, every series was empty on record. Returns `undefined` if none of
 * them has ever held anything.
 */
export function firstHeldTime(series: Series[]): number | undefined {
  let earliest: number | undefined
  series.forEach(({ times, values }) => {
    for (let index = 0; index < times.length; index += 1) {
      if (values[index] !== 0) {
        earliest = Math.min(earliest ?? times[index], times[index])
        return
      }
    }
  })
  return earliest
}

/** Builds a {@link Series} from a list of points sorted oldest first. */
export function seriesOf(points: HistoryPoint[]): Series {
  return {
    times: points.map(({ time }) => time),
    values: points.map(({ value }) => value),
  }
}

/**
 * Returns the index of the last point at or before `time` in a series sorted
 * oldest first, or -1 if `time` is before the series begins.
 */
function indexAt({ times }: Series, time: number): number {
  let low = 0
  let high = times.length - 1
  let found = -1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (times[mid] <= time) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}

/**
 * Returns the value at `time` of a series treated as a step function, which
 * is the value of the latest point at or before `time`. Returns `undefined`
 * if `time` is before the series begins.
 *
 * Note that the series must be sorted oldest first.
 */
export function valueAt(series: Series, time: number): number | undefined {
  const index = indexAt(series, time)
  return index === -1 ? undefined : series.values[index]
}

/**
 * Returns the price at `time` from a series sorted oldest first: the latest
 * price at or before `time` or, failing that, the earliest price if it is
 * within `tolerance` after `time`. This means a balance that predates the
 * first known price by a little is still valued. Returns `undefined` if
 * neither price exists.
 */
export function priceAt(
  series: Series,
  time: number,
  tolerance: number,
): number | undefined {
  const before = valueAt(series, time)
  if (before !== undefined) return before
  return series.times.length > 0 && series.times[0] - time <= tolerance
    ? series.values[0]
    : undefined
}

export type ValueSeriesInput = {
  /** Each holding's balance history, in the asset's units. */
  holdings: { priceAssetID: string; balances: Series }[]
  /** Price histories in the main currency, by the full asset id of the
   * asset each holding is priced by. */
  prices: Map<string, Series>
  from: number
  to: number
  /** How many points to sample, including both ends. */
  samples: number
  /**
   * How far after a sample time a price may be taken from, when there is no
   * price at or before it.
   */
  priceTolerance: number
}

export type ValueSeries = {
  points: HistoryPoint[]
  /**
   * The last sample whose value assumed some holding's earliest known
   * balance, because its balance history doesn't reach back that far yet;
   * `undefined` if no sample did.
   */
  estimatedUntil: number | undefined
  /**
   * The last sample whose value relied on a balance reconstructed from token
   * transfers; `undefined` if no sample did.
   */
  reconstructedUntil: number | undefined
  /**
   * Stretches of samples whose value relies mostly on prices much older than
   * history should have at that age, typically because the wallet wasn't
   * running to record them and backfill hasn't caught up. A chart can hold
   * the last value through them, but shouldn't present it as recorded.
   */
  unrecorded: { from: number; to: number }[]
  /**
   * The earliest sample at which any holding had a valued balance, or
   * `undefined` if there was none.
   */
  coverageStart: number | undefined
}

/**
 * Samples the total value of a set of holdings over time. At each sample, the
 * total is the sum of each holding's balance at that time multiplied by its
 * asset's price at that time. Every series must be sorted oldest first.
 *
 * Holdings without a price at a sample add nothing to it, the same way
 * unpriced assets add nothing to the wallet's current totals. Samples taken
 * before any holding has a valued balance are left out.
 *
 * Before a holding's balance history begins, its earliest known balance is
 * assumed, valued at the prices of the time. Balance history is often still
 * being backfilled, or can't be at all where endpoints keep no old state, and
 * leaving such holdings out would show a gain the moment their history
 * begins. Samples that rely on this are reported with
 * {@link ValueSeries.estimatedUntil}.
 *
 * Each series is walked once alongside the samples, which are in time order,
 * so the work grows with the number of points rather than with points times
 * samples.
 */
export function valueSeries({
  holdings,
  prices,
  from,
  to,
  samples,
  priceTolerance,
}: ValueSeriesInput): ValueSeries {
  const sampleCount = Math.max(samples, 1)
  const step = samples > 1 ? (to - from) / (samples - 1) : 0
  const sampleTimes = Array.from({ length: sampleCount }, (_, index) =>
    Math.round(from + step * index),
  )
  const totals = new Float64Array(sampleCount)
  const valued = new Uint8Array(sampleCount)
  const estimated = new Uint8Array(sampleCount)
  const reconstructed = new Uint8Array(sampleCount)
  // How much of each sample's value relies on prices older than history
  // should have at that age.
  const staleValue = new Float64Array(sampleCount)

  holdings.forEach(({ priceAssetID, balances }) => {
    const priceSeries = prices.get(priceAssetID)
    if (priceSeries === undefined || priceSeries.times.length === 0) return
    if (balances.times.length === 0) return
    // The index of the latest balance and price at or before each sample,
    // advanced as the samples move forward.
    let balance = -1
    let price = -1
    sampleTimes.forEach((time, sample) => {
      while (
        balance + 1 < balances.times.length &&
        balances.times[balance + 1] <= time
      ) {
        balance += 1
      }
      while (
        price + 1 < priceSeries.times.length &&
        priceSeries.times[price + 1] <= time
      ) {
        price += 1
      }
      let priceValue: number | undefined
      if (price !== -1) {
        priceValue = priceSeries.values[price]
      } else if (priceSeries.times[0] - time <= priceTolerance) {
        priceValue = priceSeries.values[0]
      }
      if (priceValue === undefined) return
      if (balance === -1) estimated[sample] = 1
      if (balances.origins?.[Math.max(balance, 0)] === RECONSTRUCTED_ORIGIN) {
        reconstructed[sample] = 1
      }
      const value = balances.values[Math.max(balance, 0)] * priceValue
      totals[sample] += value
      valued[sample] = 1
      const priceAge = time - priceSeries.times[Math.max(price, 0)]
      if (priceAge > STALE_SPACINGS * expectedSpacingForAge(to - time)) {
        staleValue[sample] += Math.abs(value)
      }
    })
  })

  const points: HistoryPoint[] = []
  let coverageStart: number | undefined
  let estimatedUntil: number | undefined
  let reconstructedUntil: number | undefined
  const unrecorded: { from: number; to: number }[] = []
  sampleTimes.forEach((time, sample) => {
    if (valued[sample] === 0) return
    coverageStart ??= time
    if (estimated[sample] === 1) estimatedUntil = time
    if (reconstructed[sample] === 1) reconstructedUntil = time
    points.push({ time, value: totals[sample] })
    if (staleValue[sample] > Math.abs(totals[sample]) / 2) {
      // Extend the current stretch if this sample follows it directly.
      const current = unrecorded[unrecorded.length - 1]
      if (current !== undefined && current.to === sampleTimes[sample - 1]) {
        current.to = time
      } else {
        unrecorded.push({ from: time, to: time })
      }
    }
  })
  return {
    points,
    coverageStart,
    estimatedUntil,
    reconstructedUntil,
    unrecorded,
  }
}
