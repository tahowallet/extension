import Dexie, { DexieOptions } from "dexie"
import { HOUR, MINUTE } from "../../constants"
import { compactableIndexes } from "../indexing/history/compaction"
import { Series } from "../indexing/history/series"

/** Where a point in a series came from. */
/**
 * Where a point in a series came from: recorded live, backfilled from the
 * chain's past state or a price source, or, for token balances on networks
 * whose endpoints keep no old state, reconstructed from token transfers.
 */
export type PointSource = "live" | "backfill" | "reconstructed"

/** A price of an asset, in the main currency, at a given time, to record. */
export type PriceRecord = {
  /** The priced asset's full asset id. */
  priceKey: string
  /**
   * The asset's symbol, kept so that copies of the asset on other networks
   * can be valued by symbol.
   */
  symbol: string
  time: number
  value: number
  source: PointSource
}

/** What identifies a holding: an account's balance of one asset. */
export type HoldingInfo = {
  /**
   * The holding's key, in the form `${address}|${assetID}`; see
   * {@link holdingKeyFor}.
   */
  holdingKey: string
  address: string
  chainID: string
  /** The asset's full asset id, which also keys its prices. */
  assetID: string
  symbol: string
  /**
   * Whether the asset was trusted when the balance was last measured. Value
   * totals across assets only count trusted assets.
   */
  trusted: boolean
}

/**
 * A balance of an asset for an account, in the asset's units, at a given
 * time, to record.
 */
export type BalanceRecord = HoldingInfo & {
  time: number
  value: number
  source: PointSource
}

/**
 * A holding as stored: its identifying information, its whole balance series,
 * and its latest balance and when it was measured.
 */
export type Holding = HoldingInfo &
  Series & {
    /** When the latest balance was measured. */
    time: number
    /** The latest balance. */
    value: number
  }

/**
 * Tracks the progress of backfill for a series, including how far back its
 * source reaches and any recent failures.
 */
export type BackfillState = {
  /** The series' key, either `price:${priceKey}` or `balances:${chainID}`. */
  key: string
  /**
   * The time before which the source has no data, for example because an
   * endpoint doesn't keep archive state or a token wasn't listed yet.
   * Backfill doesn't attempt anything earlier than the floor.
   */
  floor?: number
  /**
   * When the floor was found. After a while, the floor is ignored and
   * backfill tries to reach past it again.
   */
  floorAt?: number
  /**
   * After a failure such as a rate limit, the time before which backfill
   * won't try the series again.
   */
  notBefore?: number
  failures?: number
  /**
   * For reconstructing an account's token balances from transfers, the block
   * reconstruction has reached back to, and each holding's balance as of
   * that block, by holding key.
   */
  reconstruction?: { block: number; balances: Record<string, number> }
}

/**
 * A whole series as stored: one record per price or balance series, with its
 * points held in typed arrays, oldest first.
 *
 * IndexedDB is slow at many small reads and fast at copying typed arrays, so
 * keeping a series in one record means a chart reads a few hundred records
 * instead of tens of thousands of points, and reading a record costs little
 * more than reading one point would.
 */
type SeriesRecord = {
  /** `balance:${holdingKey}` or `price:${priceKey}`. */
  key: string
  kind: "balance" | "price"
  /** The account, for balance series; empty for price series. */
  address: string
  /** The network, for balance series; empty for price series. */
  chainID: string
  symbol: string
  /** The holding's key, for balance series. */
  holdingKey?: string
  /** The asset's full asset id, for balance series. */
  assetID?: string
  /** Whether the asset was trusted when last measured, for balance series. */
  trusted?: boolean
  /** The price key, for price series. */
  priceKey?: string
  times: Float64Array
  values: Float64Array
  /** Each point's {@link PointSource}: 0 for live, 1 for backfill. */
  sources: Uint8Array
}

/** How each {@link PointSource} is stored in a series' `sources`. */
export const SOURCE_CODES: Record<PointSource, number> = {
  live: 0,
  backfill: 1,
  reconstructed: 2,
}

const sourceCode = (source: PointSource) => SOURCE_CODES[source]

/** The window within which live balances keep at most one point per series. */
export const LIVE_BALANCE_SPACING = 5 * MINUTE

/**
 * How far past the present a point may be dated and still be recorded. Block
 * timestamps and the clocks of price sources can run a little ahead of the
 * wallet's own clock, so some slack is allowed. A point dated further ahead
 * than that has its time in the wrong unit, such as milliseconds multiplied
 * by a thousand, which dates a price from late 2026 to around the year 58800.
 *
 * Note that such a point would sort last in its series forever, so it would
 * stand in for the series' latest point: a holding's latest balance would
 * stop changing, since no live balance is newer, and live prices would
 * never follow it.
 */
export const FUTURE_TOLERANCE = HOUR

/**
 * Returns the given points without those dated more than
 * {@link FUTURE_TOLERANCE} after `now`, or with times that aren't finite.
 *
 * @param points The points to filter.
 * @param now The present, in milliseconds.
 */
function withoutFuturePoints<T extends { time: number }>(
  points: T[],
  now: number,
): T[] {
  return points.filter(
    ({ time }) => Number.isFinite(time) && time <= now + FUTURE_TOLERANCE,
  )
}

/**
 * Returns the indexes of a series' points dated more than
 * {@link FUTURE_TOLERANCE} after `now`, or with times that aren't finite.
 *
 * @param times The series' point times.
 * @param now The present, in milliseconds.
 */
function futureIndexes(times: ArrayLike<number>, now: number): number[] {
  const indexes: number[] = []
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index]
    if (!(Number.isFinite(time) && time <= now + FUTURE_TOLERANCE)) {
      indexes.push(index)
    }
  }
  return indexes
}

/**
 * How many series are read and rewritten in one transaction, by compaction
 * and by large writes. Batches yield to other work between them, so a large
 * history never holds up the background for long.
 */
const BATCH_SIZE = 100

export const holdingKeyFor = (address: string, assetID: string): string =>
  `${address.toLowerCase()}|${assetID}`

const balanceKey = (holdingKey: string) => `balance:${holdingKey}`
const priceKeyOf = (priceKey: string) => `price:${priceKey}`

/** Yields to other work in the background before continuing. */
const yieldToOtherWork = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

/**
 * Calls `work` with `items` {@link BATCH_SIZE} at a time, yielding to other
 * work between batches, and returns the sum of what each call returns.
 */
async function inBatches<T>(
  items: T[],
  work: (batch: T[]) => Promise<number>,
): Promise<number> {
  let total = 0
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    if (start > 0) {
      // oxlint-disable-next-line no-await-in-loop
      await yieldToOtherWork()
    }
    // oxlint-disable-next-line no-await-in-loop
    total += await work(items.slice(start, start + BATCH_SIZE))
  }
  return total
}

/**
 * Returns a copy of `record` with `points` merged into its series, keeping
 * points sorted oldest first. A point at the same time as an existing one
 * replaces it.
 */
function withPoints(
  record: SeriesRecord,
  points: { time: number; value: number; source: PointSource }[],
): SeriesRecord {
  // A single pass over both, already in time order, so that the usual case
  // of appending a live point costs no more than copying the series.
  const incoming = [...points].sort((a, b) => a.time - b.time)
  const existing = record.times.length
  const size = existing + incoming.length
  const times = new Float64Array(size)
  const values = new Float64Array(size)
  const sources = new Uint8Array(size)
  let count = 0
  const push = (time: number, value: number, source: number) => {
    if (count > 0 && times[count - 1] === time) {
      values[count - 1] = value
      sources[count - 1] = source
    } else {
      times[count] = time
      values[count] = value
      sources[count] = source
      count += 1
    }
  }

  let old = 0
  let next = 0
  while (old < existing || next < incoming.length) {
    if (
      next >= incoming.length ||
      (old < existing && record.times[old] < incoming[next].time)
    ) {
      push(record.times[old], record.values[old], record.sources[old])
      old += 1
    } else {
      // A new point replaces an existing one at the same time.
      if (old < existing && record.times[old] === incoming[next].time) {
        old += 1
      }
      const { time, value, source } = incoming[next]
      push(time, value, sourceCode(source))
      next += 1
    }
  }

  return {
    ...record,
    times: times.slice(0, count),
    values: values.slice(0, count),
    sources: sources.slice(0, count),
  }
}

/** Returns a copy of `record` without the points at the given indexes. */
function withoutPoints(record: SeriesRecord, indexes: number[]): SeriesRecord {
  const dropped = new Set(indexes)
  const kept = (_: number, index: number) => !dropped.has(index)
  return {
    ...record,
    times: record.times.filter(kept),
    values: record.values.filter(kept),
    sources: record.sources.filter(kept),
  }
}

/** Returns a copy of `record` with its last point replaced. */
function withLastPoint(
  record: SeriesRecord,
  { time, value, source }: { time: number; value: number; source: PointSource },
): SeriesRecord {
  const last = record.times.length - 1
  const times = record.times.slice()
  const values = record.values.slice()
  const sources = record.sources.slice()
  times[last] = time
  values[last] = value
  sources[last] = sourceCode(source)
  return { ...record, times, values, sources }
}

const emptyBalanceSeries = (info: HoldingInfo): SeriesRecord => ({
  key: balanceKey(info.holdingKey),
  kind: "balance",
  address: info.address.toLowerCase(),
  chainID: info.chainID,
  symbol: info.symbol,
  holdingKey: info.holdingKey,
  assetID: info.assetID,
  trusted: info.trusted,
  times: new Float64Array(0),
  values: new Float64Array(0),
  sources: new Uint8Array(0),
})

const holdingOf = (record: SeriesRecord): Holding => {
  const last = record.times.length - 1
  return {
    holdingKey: record.holdingKey ?? "",
    address: record.address,
    chainID: record.chainID,
    assetID: record.assetID ?? "",
    symbol: record.symbol,
    trusted: record.trusted ?? false,
    times: record.times,
    values: record.values,
    sources: record.sources,
    time: record.times[last] ?? 0,
    value: record.values[last] ?? 0,
  }
}

/** Groups records by a key, keeping their order. */
function groupBy<T>(records: T[], keyOf: (record: T) => string) {
  const groups = new Map<string, T[]>()
  records.forEach((record) => {
    const key = keyOf(record)
    const group = groups.get(key)
    if (group) group.push(record)
    else groups.set(key, [record])
  })
  return groups
}

/**
 * The HistoryDatabase stores compact, chartable history of prices and
 * balances. Each price or balance series is a single record holding all of its
 * points, which are kept at decreasing resolution as they age, per the
 * retention tiers used by {@link compactableIndexes}.
 */
export class HistoryDatabase extends Dexie {
  private series!: Dexie.Table<SeriesRecord, string>

  private backfill!: Dexie.Table<BackfillState, string>

  constructor(options?: DexieOptions) {
    super("tally/history", options)
    this.version(1).stores({
      prices: "++id,[priceKey+time],symbol,time",
      balances: "++id,[holdingKey+time],[address+chainID],address,time",
      backfill: "&key",
    })
    this.version(2).stores({
      prices: "++id,[priceKey+time],[symbol+priceKey],time",
      balances: "++id,[holdingKey+time],address,time",
      backfill: "&key",
      holdings: "&holdingKey,address",
    })
    // Version 3 keeps each series in a single record. History from earlier
    // versions, which never shipped, is dropped rather than converted, and
    // backfill fills it back in; dropping tables needs no work in the upgrade
    // itself, so it can't hold up the background.
    this.version(3)
      .stores({
        prices: null,
        balances: null,
        holdings: null,
        backfill: "&key",
        series: "&key,[kind+address],[kind+chainID],[kind+symbol]",
      })
      .upgrade((transaction) => transaction.table("backfill").clear())
  }

  /**
   * Records prices, merging each into its asset's price series. A price at
   * the same time as an existing one replaces it.
   *
   * Note that prices dated more than {@link FUTURE_TOLERANCE} ahead of now
   * are dropped, since their times can only be in the wrong unit.
   */
  async addPrices(records: PriceRecord[]): Promise<void> {
    const kept = withoutFuturePoints(records, Date.now())
    if (kept.length === 0) return
    const byKey = groupBy(kept, ({ priceKey }) => priceKey)
    await inBatches([...byKey.keys()], async (keys) =>
      this.transaction("rw", this.series, async () => {
        const existing = await this.series.bulkGet(keys.map(priceKeyOf))
        await this.series.bulkPut(
          keys.map((priceKey, index) => {
            const points = byKey.get(priceKey) ?? []
            const record = existing[index] ?? {
              key: priceKeyOf(priceKey),
              kind: "price" as const,
              address: "",
              chainID: "",
              symbol: points[0]?.symbol ?? "",
              priceKey,
              times: new Float64Array(0),
              values: new Float64Array(0),
              sources: new Uint8Array(0),
            }
            return withPoints(record, points)
          }),
        )
        return keys.length
      }),
    )
  }

  /**
   * Records live balances, skipping any that are no newer than their series'
   * latest point, or that repeat its value within an hour of it. Balances are
   * step functions, so a repeated value adds nothing but proof that the
   * balance held, and an hourly point is enough for that.
   *
   * The wallet reports a zero balance for every token it tracks, held or not,
   * so a holding only starts with its first balance that isn't zero. Once
   * something has been held, zero balances are recorded like any other,
   * since dropping to zero belongs on a chart.
   *
   * A balance that changes every block, like an interest-bearing token's,
   * keeps one point per {@link LIVE_BALANCE_SPACING} window: if the latest
   * point is also live and falls in the same window, the new balance replaces
   * it. That way, the latest point is always current without storing a point
   * per block.
   *
   * Balances dated more than {@link FUTURE_TOLERANCE} ahead of now are
   * dropped, as {@link addPrices} drops prices.
   *
   * Returns the number of balances that were added or replaced.
   */
  async addLiveBalances(records: BalanceRecord[]): Promise<number> {
    const latestInBatch = new Map<string, BalanceRecord>()
    withoutFuturePoints(records, Date.now()).forEach((record) => {
      const seen = latestInBatch.get(record.holdingKey)
      if (!seen || seen.time < record.time) {
        latestInBatch.set(record.holdingKey, record)
      }
    })
    return inBatches([...latestInBatch.values()], async (candidates) =>
      this.transaction("rw", this.series, async () => {
        const existing = await this.series.bulkGet(
          candidates.map(({ holdingKey }) => balanceKey(holdingKey)),
        )
        const updated: SeriesRecord[] = []
        candidates.forEach((record, index) => {
          const series = existing[index]
          const last = series === undefined ? -1 : series.times.length - 1
          if (series === undefined || last < 0) {
            if (record.value !== 0) {
              updated.push(withPoints(emptyBalanceSeries(record), [record]))
            }
            return
          }
          const knownTime = series.times[last]
          const knownValue = series.values[last]
          if (
            record.time <= knownTime ||
            (record.value === knownValue && record.time - knownTime < HOUR)
          ) {
            // No new point, but whether the asset is trusted can change, for
            // example once a token list loads, and totals only count trusted
            // holdings, so it's kept current regardless.
            if (series.trusted !== record.trusted) {
              updated.push({ ...series, trusted: record.trusted })
            }
            return
          }
          const current = { ...series, trusted: record.trusted }
          if (
            series.sources[last] === SOURCE_CODES.live &&
            Math.floor(record.time / LIVE_BALANCE_SPACING) ===
              Math.floor(knownTime / LIVE_BALANCE_SPACING)
          ) {
            updated.push(withLastPoint(current, record))
          } else {
            updated.push(withPoints(current, [record]))
          }
        })
        if (updated.length > 0) await this.series.bulkPut(updated)
        return updated.length
      }),
    )
  }

  async addBalance(record: BalanceRecord): Promise<void> {
    await this.addLiveBalances([record])
  }

  /**
   * Records balances as given, merging each into its holding's series and
   * creating the series if needed. Backfill uses this to fill in history,
   * where zero balances are as meaningful as any other. Balances dated more
   * than {@link FUTURE_TOLERANCE} ahead of now are dropped, as
   * {@link addPrices} drops prices.
   */
  async addBalances(records: BalanceRecord[]): Promise<void> {
    const kept = withoutFuturePoints(records, Date.now())
    if (kept.length === 0) return
    const byHolding = groupBy(kept, ({ holdingKey }) => holdingKey)
    await inBatches([...byHolding.keys()], async (holdingKeys) =>
      this.transaction("rw", this.series, async () => {
        const existing = await this.series.bulkGet(holdingKeys.map(balanceKey))
        await this.series.bulkPut(
          holdingKeys.map((holdingKey, index) => {
            const points = byHolding.get(holdingKey) ?? []
            return withPoints(
              existing[index] ?? emptyBalanceSeries(points[0]),
              points,
            )
          }),
        )
        return holdingKeys.length
      }),
    )
  }

  /**
   * Returns the holdings recorded for the given account addresses, each with
   * its whole balance series.
   */
  async getHoldings(addresses: string[]): Promise<Holding[]> {
    if (addresses.length === 0) return []
    const records = await this.series
      .where("[kind+address]")
      .anyOf(addresses.map((address) => ["balance", address.toLowerCase()]))
      .toArray()
    return records.map(holdingOf)
  }

  /**
   * Returns the price series for the given price keys, by price key. Keys
   * with no recorded prices are left out.
   */
  async getPriceSeries(priceKeys: string[]): Promise<Map<string, Series>> {
    const records = await this.series.bulkGet(priceKeys.map(priceKeyOf))
    const found = new Map<string, Series>()
    records.forEach((record, index) => {
      if (record !== undefined) {
        found.set(priceKeys[index], {
          times: record.times,
          values: record.values,
        })
      }
    })
    return found
  }

  /**
   * Returns every recorded price key, grouped by the symbol it was recorded
   * with, which is what valuing assets by symbol needs. Note that this reads
   * only an index, not the prices themselves.
   */
  async getPriceKeysBySymbol(): Promise<Map<string, string[]>> {
    const collection = this.series
      .where("[kind+symbol]")
      .between(["price", Dexie.minKey], ["price", Dexie.maxKey])
    const [indexKeys, primaryKeys] = await Promise.all([
      collection.keys(),
      collection.primaryKeys(),
    ])
    const bySymbol = new Map<string, string[]>()
    indexKeys.forEach((indexKey, position) => {
      if (!Array.isArray(indexKey) || typeof indexKey[1] !== "string") return
      const priceKey = String(primaryKeys[position]).slice("price:".length)
      const keys = bySymbol.get(indexKey[1])
      if (keys) keys.push(priceKey)
      else bySymbol.set(indexKey[1], [priceKey])
    })
    return bySymbol
  }

  async getBackfillState(key: string): Promise<BackfillState> {
    return (await this.backfill.get(key)) ?? { key }
  }

  async putBackfillState(state: BackfillState): Promise<void> {
    await this.backfill.put(state)
  }

  /**
   * Thins every price and balance series down to its retention tiers as of
   * `now`, and returns the number of points dropped.
   *
   * Points dated more than {@link FUTURE_TOLERANCE} after `now` are dropped
   * too. Writes refuse such points, but a history can still hold some that
   * were stored without that check, for example live prices whose
   * milliseconds were taken for seconds. Such a point sorts last forever and
   * stands in for its series' latest point, so dropping it here lets the
   * series move again.
   *
   * Series are read and rewritten {@link BATCH_SIZE} at a time,
   * with a pause for other background work between pages, so compacting a
   * large history never holds up the background for long.
   */
  async compact(now: number): Promise<number> {
    let dropped = 0
    let after: string | undefined
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop
      const page = await (
        after === undefined
          ? this.series.orderBy(":id")
          : this.series.where(":id").above(after)
      )
        .limit(BATCH_SIZE)
        .toArray()
      if (page.length === 0) return dropped
      after = page[page.length - 1].key

      const thinned = page.flatMap((record) => {
        const indexes = [
          ...new Set([
            ...futureIndexes(record.times, now),
            ...compactableIndexes(Array.from(record.times), now),
          ]),
        ]
        dropped += indexes.length
        return indexes.length > 0 ? [withoutPoints(record, indexes)] : []
      })
      // oxlint-disable-next-line no-await-in-loop
      if (thinned.length > 0) await this.series.bulkPut(thinned)
      // oxlint-disable-next-line no-await-in-loop
      await yieldToOtherWork()
    }
  }
}

export async function getOrCreateDB(): Promise<HistoryDatabase> {
  return new HistoryDatabase()
}
