/** A point in a series of measurements. */
export type HistoryPoint = { time: number; value: number }

/**
 * Returns the value at `time` of a series treated as a step function, which
 * is the value of the latest point at or before `time`. Returns `undefined`
 * if `time` is before the series begins.
 *
 * Note that `points` must be sorted oldest first.
 */
export function valueAt(
  points: HistoryPoint[],
  time: number,
): number | undefined {
  // Binary search for the last point at or before `time`, which relies on
  // points being sorted oldest first.
  let low = 0
  let high = points.length - 1
  let found: number | undefined
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (points[mid].time <= time) {
      found = points[mid].value
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}

/**
 * Returns the price at `time` from a series sorted oldest first: the latest
 * price at or before `time` or, failing that, the earliest price if it is
 * within `tolerance` after `time`. This means a balance that predates the
 * first known price by a little is still valued. Returns `undefined` if
 * neither price exists.
 */
export function priceAt(
  points: HistoryPoint[],
  time: number,
  tolerance: number,
): number | undefined {
  const before = valueAt(points, time)
  if (before !== undefined) return before
  const first = points[0]
  return first && first.time - time <= tolerance ? first.value : undefined
}

export type ValueSeriesInput = {
  /** Each holding's balance history, in the asset's units. */
  holdings: { priceKey: string; balances: HistoryPoint[] }[]
  /** Price histories in the main currency, by the holdings' price keys. */
  prices: Map<string, HistoryPoint[]>
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
 * asset's price at that time.
 *
 * Holdings without a balance or a price at a sample add nothing to it, the
 * same way unpriced assets add nothing to the wallet's current totals.
 * Samples taken before any holding has a valued balance are left out.
 */
export function valueSeries({
  holdings,
  prices,
  from,
  to,
  samples,
  priceTolerance,
}: ValueSeriesInput): ValueSeries {
  const sortedHoldings = holdings.map(({ priceKey, balances }) => ({
    prices: [...(prices.get(priceKey) ?? [])].sort((a, b) => a.time - b.time),
    balances: [...balances].sort((a, b) => a.time - b.time),
  }))

  const step = samples > 1 ? (to - from) / (samples - 1) : 0
  const points: HistoryPoint[] = []
  let coverageStart: number | undefined

  for (let i = 0; i < Math.max(samples, 1); i += 1) {
    const time = Math.round(from + step * i)
    let total = 0
    let valued = false

    sortedHoldings.forEach((holding) => {
      const balance = valueAt(holding.balances, time)
      if (balance === undefined) return
      const price = priceAt(holding.prices, time, priceTolerance)
      if (price === undefined) return
      total += balance * price
      valued = true
    })

    if (valued) {
      coverageStart ??= time
      points.push({ time, value: total })
    }
  }

  return { points, coverageStart }
}
