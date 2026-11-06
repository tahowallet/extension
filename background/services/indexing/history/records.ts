import { HOUR, MINUTE } from "../../../constants"
import type { AccountBalance } from "../../../accounts"
import {
  FullAssetID,
  getFullAssetID,
  isTrustedAsset,
} from "../../../redux-slices/utils/asset-utils"
import { normalizeEVMAddress } from "../../../lib/utils"
import { compactableIndexes } from "./compaction"
import { Series } from "./series"

/**
 * How a point in a series was obtained: measured live as the wallet ran,
 * backfilled from the chain's past state or a price source, or, for token
 * balances on networks whose endpoints keep no old state, reconstructed from
 * token transfers.
 *
 * Note that this is unrelated to an {@link AccountBalance}'s `dataSource`,
 * which names the provider a balance came from.
 */
export type PointOrigin = "live" | "backfill" | "reconstructed"

/** How each {@link PointOrigin} is stored in a series' `origins`. */
export const ORIGIN_CODES: Record<PointOrigin, number> = {
  live: 0,
  backfill: 1,
  reconstructed: 2,
}

/**
 * A price of an asset, in the main currency, at a given time, to merge into
 * the asset's price series.
 */
export type PriceMeasurement = {
  /** The priced asset's full asset id, which keys its price series. */
  assetID: FullAssetID
  /**
   * The asset's symbol, kept so that copies of the asset on other networks
   * can be valued by symbol.
   */
  symbol: string
  /** When the price applies, as a UNIX time in milliseconds. */
  time: number
  value: number
  origin: PointOrigin
}

/** What identifies a balance series: an account's balance of one asset. */
export type BalanceSeriesInfo = {
  /** The series' key; see {@link balanceSeriesKeyFor}. */
  key: string
  /** The account's address, normalized. */
  address: string
  chainID: string
  /** The asset's full asset id, which also keys its prices. */
  assetID: FullAssetID
  symbol: string
  /**
   * Whether the asset was trusted when the balance was last measured. Value
   * totals across assets only count trusted assets.
   */
  trusted: boolean
}

/**
 * A balance of an asset for an account, in the asset's units, at a given
 * time, to merge into its balance series.
 */
export type BalanceMeasurement = BalanceSeriesInfo & {
  /** When the balance applies, as a UNIX time in milliseconds. */
  retrievedAt: number
  value: number
  origin: PointOrigin
}

/**
 * A balance series as read: its identifying information, its points, and its
 * latest balance and when it was measured.
 */
export type BalanceSeries = BalanceSeriesInfo &
  Series & {
    /** When the latest balance was measured. */
    retrievedAt: number
    /** The latest balance. */
    value: number
  }

/**
 * Tracks the progress of backfill for one source of history, including how
 * far back it reaches and any recent failures.
 */
export type BackfillState = {
  /**
   * What is being backfilled: `price:${assetID}` for an asset's prices,
   * `balances:${chainID}` for every balance series on a network, or
   * `transfers:${chainID}:${address}` for reconstructing an account's token
   * balances from transfers.
   */
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
   * won't try the source again.
   */
  notBefore?: number
  failures?: number
  /**
   * For reconstructing an account's token balances from transfers, the block
   * reconstruction has reached back to, and each balance series' balance as
   * of that block, by series key.
   */
  reconstruction?: { block: number; balances: Record<string, number> }
}

/** The points of a stored series, held in typed arrays, oldest first. */
type StoredPoints = {
  times: Float64Array
  values: Float64Array
  /** Each point's {@link PointOrigin}, as one of {@link ORIGIN_CODES}. */
  origins: Uint8Array
}

/**
 * A balance series as stored in the indexing database's `balances` table:
 * one record per account and asset, keyed by {@link balanceSeriesKeyFor}.
 */
export type BalanceSeriesRecord = BalanceSeriesInfo &
  StoredPoints & { kind: "balance" }

/**
 * A price series as stored in the indexing database's `prices` table: one
 * record per asset, keyed by {@link priceSeriesKeyFor}.
 */
export type PriceSeriesRecord = StoredPoints & {
  kind: "price"
  key: string
  assetID: FullAssetID
  symbol: string
}

/**
 * A {@link BackfillState} as stored, beside the series it concerns: price
 * backfill in the `prices` table, and balance backfill and reconstruction in
 * the `balances` table. Its key is the state's key prefixed with `backfill:`,
 * so it can't collide with a series' key.
 */
export type BackfillRecord = Omit<BackfillState, "key"> & {
  kind: "backfill"
  key: string
}

export type SeriesRecord = BalanceSeriesRecord | PriceSeriesRecord

/** The window within which live balances keep at most one point per series. */
export const LIVE_BALANCE_SPACING = 5 * MINUTE

/**
 * The minimum spacing between live prices for each asset. Prices arrive every
 * minute for every tracked asset, but compaction keeps no more than one every
 * five minutes anyway.
 */
export const LIVE_PRICE_SPACING = 5 * MINUTE

/**
 * How far past the present a point may be dated and still be recorded. Block
 * timestamps and the clocks of price sources can run a little ahead of the
 * wallet's own clock, so some slack is allowed. A point dated further ahead
 * than that has its time in the wrong unit, such as milliseconds multiplied
 * by a thousand, which dates a price from late 2026 to around the year 58800.
 *
 * Note that such a point would sort last in its series forever, so it would
 * stand in for the series' latest point: a latest balance would stop
 * changing, since no live balance is newer, and live prices would never
 * follow it.
 */
export const FUTURE_TOLERANCE = HOUR

/**
 * Returns the key of an account's balance series for an asset, in the form
 * `balance:${address}|${assetID}`, with the address lowercased.
 */
export const balanceSeriesKeyFor = (
  address: string,
  assetID: FullAssetID,
): string => `balance:${address.toLowerCase()}|${assetID}`

/** Returns the key of an asset's price series, `price:${assetID}`. */
export const priceSeriesKeyFor = (assetID: FullAssetID): string =>
  `price:${assetID}`

/** Returns the stored key of a {@link BackfillState}'s record. */
export const backfillRecordKeyFor = (stateKey: string): string =>
  `backfill:${stateKey}`

/**
 * Checks whether a point's time can be recorded as of `now`: it is finite and
 * dated no more than {@link FUTURE_TOLERANCE} after `now`.
 *
 * @param now The present, in milliseconds.
 */
export const isRecordableTime = (time: number, now: number): boolean =>
  Number.isFinite(time) && time <= now + FUTURE_TOLERANCE

/**
 * Returns the indexes of a series' points that can't be recorded as of
 * `now`; see {@link isRecordableTime}.
 */
function futureIndexes(times: ArrayLike<number>, now: number): number[] {
  const indexes: number[] = []
  for (let index = 0; index < times.length; index += 1) {
    if (!isRecordableTime(times[index], now)) indexes.push(index)
  }
  return indexes
}

/** A point to merge into a series. */
type IncomingPoint = { time: number; value: number; origin: PointOrigin }

/**
 * Returns a copy of `record` with `points` merged into its series, keeping
 * points sorted oldest first. A point at the same time as an existing one
 * replaces it.
 */
export function withPoints<T extends StoredPoints>(
  record: T,
  points: IncomingPoint[],
): T {
  // A single pass over both, already in time order, so that the usual case
  // of appending a live point costs no more than copying the series.
  const incoming = [...points].sort((a, b) => a.time - b.time)
  const existing = record.times.length
  const size = existing + incoming.length
  const times = new Float64Array(size)
  const values = new Float64Array(size)
  const origins = new Uint8Array(size)
  let count = 0
  const push = (time: number, value: number, origin: number) => {
    if (count > 0 && times[count - 1] === time) {
      values[count - 1] = value
      origins[count - 1] = origin
    } else {
      times[count] = time
      values[count] = value
      origins[count] = origin
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
      push(record.times[old], record.values[old], record.origins[old])
      old += 1
    } else {
      // A new point replaces an existing one at the same time.
      if (old < existing && record.times[old] === incoming[next].time) {
        old += 1
      }
      const { time, value, origin } = incoming[next]
      push(time, value, ORIGIN_CODES[origin])
      next += 1
    }
  }

  return {
    ...record,
    times: times.slice(0, count),
    values: values.slice(0, count),
    origins: origins.slice(0, count),
  }
}

/** Returns a copy of `record` without the points at the given indexes. */
function withoutPoints<T extends StoredPoints>(
  record: T,
  indexes: number[],
): T {
  const dropped = new Set(indexes)
  const kept = (_: number, index: number) => !dropped.has(index)
  return {
    ...record,
    times: record.times.filter(kept),
    values: record.values.filter(kept),
    origins: record.origins.filter(kept),
  }
}

/** Returns a copy of `record` with its last point replaced. */
function withLastPoint<T extends StoredPoints>(
  record: T,
  { time, value, origin }: IncomingPoint,
): T {
  const last = record.times.length - 1
  const times = record.times.slice()
  const values = record.values.slice()
  const origins = record.origins.slice()
  times[last] = time
  values[last] = value
  origins[last] = ORIGIN_CODES[origin]
  return { ...record, times, values, origins }
}

/**
 * Returns `record` thinned to its retention tiers as of `now`, without points
 * dated past {@link FUTURE_TOLERANCE}, along with the number of points
 * dropped. The record itself is returned when nothing is dropped.
 */
export function compacted<T extends StoredPoints>(
  record: T,
  now: number,
): { record: T; dropped: number } {
  const indexes = [
    ...new Set([
      ...futureIndexes(record.times, now),
      ...compactableIndexes(Array.from(record.times), now),
    ]),
  ]
  return indexes.length > 0
    ? { record: withoutPoints(record, indexes), dropped: indexes.length }
    : { record, dropped: 0 }
}

export const emptyPriceSeries = (
  assetID: FullAssetID,
  symbol: string,
): PriceSeriesRecord => ({
  kind: "price",
  key: priceSeriesKeyFor(assetID),
  assetID,
  symbol,
  times: new Float64Array(0),
  values: new Float64Array(0),
  origins: new Uint8Array(0),
})

export const emptyBalanceSeries = (
  info: BalanceSeriesInfo,
): BalanceSeriesRecord => ({
  kind: "balance",
  key: info.key,
  address: info.address.toLowerCase(),
  chainID: info.chainID,
  assetID: info.assetID,
  symbol: info.symbol,
  trusted: info.trusted,
  times: new Float64Array(0),
  values: new Float64Array(0),
  origins: new Uint8Array(0),
})

/** Returns a stored balance series as read, with its latest balance. */
export const balanceSeriesOf = (record: BalanceSeriesRecord): BalanceSeries => {
  const last = record.times.length - 1
  return {
    key: record.key,
    address: record.address,
    chainID: record.chainID,
    assetID: record.assetID,
    symbol: record.symbol,
    trusted: record.trusted,
    times: record.times,
    values: record.values,
    origins: record.origins,
    retrievedAt: record.times[last] ?? 0,
    value: record.values[last] ?? 0,
  }
}

/** Returns a balance series' identifying information, without its points. */
export const balanceSeriesInfoOf = ({
  key,
  address,
  chainID,
  assetID,
  symbol,
  trusted,
}: BalanceSeriesInfo): BalanceSeriesInfo => ({
  key,
  address,
  chainID,
  assetID,
  symbol,
  trusted,
})

/**
 * Returns the live balance measurement for an account balance the wallet
 * fetched, with its amount converted to the asset's units.
 */
export function liveBalanceMeasurementOf({
  address,
  network,
  assetAmount: { asset, amount },
  retrievedAt,
}: AccountBalance): BalanceMeasurement {
  const assetID = getFullAssetID(asset)
  return {
    key: balanceSeriesKeyFor(address, assetID),
    address: normalizeEVMAddress(address),
    chainID: network.chainID,
    assetID,
    symbol: asset.symbol,
    trusted: isTrustedAsset(asset),
    retrievedAt,
    value: Number(amount) / 10 ** asset.decimals,
    origin: "live",
  }
}

/**
 * Returns what a live balance changes in its series, given the series'
 * latest point, or `undefined` if the series has none:
 *
 * - `"skip"` if the balance is no newer than the latest point, repeats its
 *   value within an hour of it, or is a zero that would start the series;
 * - `"replace"` if the latest point is also live and falls in the same
 *   {@link LIVE_BALANCE_SPACING} window, so the balance takes its place;
 * - `"append"` otherwise.
 *
 * Balances are step functions, so a repeated value adds nothing but proof
 * that the balance held, and an hourly point is enough for that. The wallet
 * reports a zero balance for every token it tracks, held or not, so a series
 * only starts with its first balance that isn't zero. Once something has
 * been held, zero balances are recorded like any other, since dropping to
 * zero belongs on a chart. A balance that changes every block, like an
 * interest-bearing token's, keeps one point per window, so the latest point
 * is always current without storing a point per block.
 */
export function liveBalanceChange(
  latest: { time: number; value: number; origin: number } | undefined,
  { retrievedAt, value }: { retrievedAt: number; value: number },
): "skip" | "replace" | "append" {
  if (latest === undefined) return value === 0 ? "skip" : "append"
  if (
    retrievedAt <= latest.time ||
    (value === latest.value && retrievedAt - latest.time < HOUR)
  ) {
    return "skip"
  }
  return latest.origin === ORIGIN_CODES.live &&
    Math.floor(retrievedAt / LIVE_BALANCE_SPACING) ===
      Math.floor(latest.time / LIVE_BALANCE_SPACING)
    ? "replace"
    : "append"
}

/**
 * Returns `series` with a live balance applied as {@link liveBalanceChange}
 * decides, or `undefined` if the series doesn't change at all.
 *
 * Note that whether the asset is trusted can change without a new point, for
 * example once a token list loads, and totals only count trusted series, so
 * it's kept current regardless.
 */
export function withLiveBalance(
  series: BalanceSeriesRecord | undefined,
  measurement: BalanceMeasurement,
): BalanceSeriesRecord | undefined {
  const last = series === undefined ? -1 : series.times.length - 1
  const latest =
    series === undefined || last < 0
      ? undefined
      : {
          time: series.times[last],
          value: series.values[last],
          origin: series.origins[last],
        }
  const point = {
    time: measurement.retrievedAt,
    value: measurement.value,
    origin: measurement.origin,
  }
  const change = liveBalanceChange(latest, measurement)
  if (series === undefined || latest === undefined) {
    return change === "skip"
      ? undefined
      : withPoints(emptyBalanceSeries(measurement), [point])
  }
  if (change === "skip") {
    return series.trusted === measurement.trusted
      ? undefined
      : { ...series, trusted: measurement.trusted }
  }
  const current = { ...series, trusted: measurement.trusted }
  return change === "replace"
    ? withLastPoint(current, point)
    : withPoints(current, [point])
}
