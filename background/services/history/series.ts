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
  holdings: { priceKey: string; balances: Series }[]
  /** Price histories in the main currency, by the holdings' price keys. */
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
 * Holdings without a balance or a price at a sample add nothing to it, the
 * same way unpriced assets add nothing to the wallet's current totals.
 * Samples taken before any holding has a valued balance are left out.
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

  holdings.forEach(({ priceKey, balances }) => {
    const priceSeries = prices.get(priceKey)
    if (priceSeries === undefined || priceSeries.times.length === 0) return
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
      if (balance === -1) return
      let priceValue: number | undefined
      if (price !== -1) {
        priceValue = priceSeries.values[price]
      } else if (priceSeries.times[0] - time <= priceTolerance) {
        priceValue = priceSeries.values[0]
      }
      if (priceValue === undefined) return
      totals[sample] += balances.values[balance] * priceValue
      valued[sample] = 1
    })
  })

  const points: HistoryPoint[] = []
  let coverageStart: number | undefined
  sampleTimes.forEach((time, sample) => {
    if (valued[sample] === 0) return
    coverageStart ??= time
    points.push({ time, value: totals[sample] })
  })
  return { points, coverageStart }
}
