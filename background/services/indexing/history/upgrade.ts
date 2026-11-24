import type { Table } from "dexie"
import type { AccountBalance } from "../../../accounts"
import type { PricePoint } from "../../../assets"
import type { FullAssetID } from "../../../redux-slices/utils/asset-utils"
import { livePriceMeasurement } from "./live"
import {
  BalanceSeriesRecord,
  ORIGIN_CODES,
  PriceSeriesRecord,
  SeriesRecord,
  compacted,
  emptyBalanceSeries,
  emptyPriceSeries,
  isRecordableTime,
  liveBalanceChange,
  LIVE_PRICE_SPACING,
  liveBalanceMeasurementOf,
} from "./records"

/**
 * The most rows of each legacy table that are converted to series. Older rows
 * are dropped without being read, and backfill fills that history back in.
 *
 * The legacy balances and prices tables only ever had rows added, so a
 * long-lived install can have millions of them. Converting every one would
 * hold up the indexing service, and with it token lists and balances, for as
 * long as that takes.
 */
export const MAX_CONVERTED_ROWS = 100_000

/** How many rows are read at a time. */
const PAGE_SIZE = 2_000

/** Points of a series being converted, in plain arrays until written. */
type Draft = { times: number[]; values: number[]; origins: number[] }

/**
 * Calls `visit` with the newest {@link MAX_CONVERTED_ROWS} rows of a table,
 * {@link PAGE_SIZE} at a time, oldest first. Rows are in the order they were
 * added, which is the order the wallet measured them in.
 */
async function forEachNewestPage<T extends { id?: number }>(
  table: Table<T, number>,
  maxRows: number,
  visit: (rows: T[]) => void,
): Promise<void> {
  const [firstKept] = await table
    .orderBy(":id")
    .reverse()
    .offset(maxRows - 1)
    .limit(1)
    .primaryKeys()
  let page = await (
    firstKept === undefined
      ? table.orderBy(":id")
      : table.where(":id").aboveOrEqual(firstKept)
  )
    .limit(PAGE_SIZE)
    .toArray()
  while (page.length > 0) {
    visit(page)
    const last = page[page.length - 1].id
    if (last === undefined) return
    // The conversion runs before the wallet opens its database, so pages
    // yield to whatever else the background is doing.
    // oxlint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    // oxlint-disable-next-line no-await-in-loop
    page = await table.where(":id").above(last).limit(PAGE_SIZE).toArray()
  }
}

/**
 * Returns `draft`'s points in typed arrays on a copy of `record`, compacted
 * to their retention tiers as of `now`.
 */
function finished<T extends SeriesRecord>(
  record: T,
  draft: Draft,
  now: number,
): T {
  return compacted(
    {
      ...record,
      times: Float64Array.from(draft.times),
      values: Float64Array.from(draft.values),
      origins: Uint8Array.from(draft.origins),
    },
    now,
  ).record
}

/**
 * Converts the rows of the legacy `balances` table, one per measured account
 * balance, into one balance series per account and asset. Rows are replayed
 * in the order they were added with the same rules live balances follow, so a series ends up with the
 * points it would have had if it had been recorded live all along; see
 * {@link liveBalanceChange}.
 */
async function convertBalances(
  table: Table<AccountBalance & { id?: number }, number>,
  now: number,
  maxRows: number,
): Promise<BalanceSeriesRecord[]> {
  const drafts = new Map<
    string,
    { record: BalanceSeriesRecord; draft: Draft }
  >()
  await forEachNewestPage(table, maxRows, (rows) => {
    rows.forEach((row) => {
      let measurement
      try {
        measurement = liveBalanceMeasurementOf(row)
      } catch {
        // A row too malformed to measure anything is dropped.
        return
      }
      if (!isRecordableTime(measurement.retrievedAt, now)) return
      const existing = drafts.get(measurement.key)
      const last = existing === undefined ? -1 : existing.draft.times.length - 1
      const change = liveBalanceChange(
        existing === undefined
          ? undefined
          : {
              time: existing.draft.times[last],
              value: existing.draft.values[last],
              origin: existing.draft.origins[last],
            },
        measurement,
      )
      if (existing === undefined) {
        if (change === "skip") return
        drafts.set(measurement.key, {
          record: emptyBalanceSeries(measurement),
          draft: {
            times: [measurement.retrievedAt],
            values: [measurement.value],
            origins: [ORIGIN_CODES.live],
          },
        })
        return
      }
      existing.record.trusted = measurement.trusted
      if (change === "skip") return
      const { draft } = existing
      if (change === "replace") {
        draft.times[last] = measurement.retrievedAt
        draft.values[last] = measurement.value
      } else {
        draft.times.push(measurement.retrievedAt)
        draft.values.push(measurement.value)
        draft.origins.push(ORIGIN_CODES.live)
      }
    })
  })
  return [...drafts.values()].map(({ record, draft }) =>
    finished(record, draft, now),
  )
}

/**
 * Converts the rows of the legacy `prices` table, one per measured price
 * point, into one price series per asset. Each row is converted as a live
 * price is, which reads its time as milliseconds or seconds by size and drops
 * points that don't price an asset in fiat; see {@link livePriceMeasurement}. As for live prices, an asset
 * keeps at most one price per {@link LIVE_PRICE_SPACING}.
 */
async function convertPrices(
  table: Table<PricePoint & { id?: number }, number>,
  now: number,
  maxRows: number,
): Promise<PriceSeriesRecord[]> {
  const drafts = new Map<
    FullAssetID,
    { record: PriceSeriesRecord; draft: Draft }
  >()
  await forEachNewestPage(table, maxRows, (rows) => {
    rows.forEach((row) => {
      let measurement
      try {
        measurement = livePriceMeasurement(row)
      } catch {
        return
      }
      if (
        measurement === undefined ||
        !isRecordableTime(measurement.time, now)
      ) {
        return
      }
      const { assetID, symbol, time, value } = measurement
      let entry = drafts.get(assetID)
      if (entry === undefined) {
        entry = {
          record: emptyPriceSeries(assetID, symbol),
          draft: { times: [], values: [], origins: [] },
        }
        drafts.set(assetID, entry)
      }
      const { times, values, origins } = entry.draft
      const last = times[times.length - 1]
      // Rows were added in the order prices arrived, so the latest kept price
      // is last, as the live recorder's spacing assumes.
      if (last !== undefined && time - last < LIVE_PRICE_SPACING) return
      times.push(time)
      values.push(value)
      origins.push(ORIGIN_CODES.live)
    })
  })
  return [...drafts.values()].map(({ record, draft }) => {
    // Rows can arrive out of time order, for example from two price sources,
    // so each series is sorted before it is stored.
    const order = draft.times
      .map((_, index) => index)
      .sort((a, b) => draft.times[a] - draft.times[b])
    return finished(
      record,
      {
        times: order.map((index) => draft.times[index]),
        values: order.map((index) => draft.values[index]),
        origins: order.map((index) => draft.origins[index]),
      },
      now,
    )
  })
}

/**
 * Converts the newest {@link MAX_CONVERTED_ROWS} rows of the legacy indexing
 * database's `balances` and `prices` tables, one row per measurement, into
 * series for the indexing database to start with.
 *
 * @param now The present, in milliseconds, against which series are
 *        compacted and future-dated rows dropped.
 * @param maxRows How many of each table's newest rows to convert.
 */
export async function seriesFromMeasurements(
  tables: {
    balances: Table<AccountBalance & { id?: number }, number>
    prices: Table<PricePoint & { id?: number }, number>
  },
  now = Date.now(),
  maxRows = MAX_CONVERTED_ROWS,
): Promise<{ balances: BalanceSeriesRecord[]; prices: PriceSeriesRecord[] }> {
  return {
    balances: await convertBalances(tables.balances, now, maxRows),
    prices: await convertPrices(tables.prices, now, maxRows),
  }
}
