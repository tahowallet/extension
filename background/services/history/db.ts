import Dexie, { DexieOptions } from "dexie"
import { HOUR, MINUTE } from "../../constants"
import { compactableIndexes } from "./compaction"
import { HistoryPoint } from "./series"

/** A recorded price of an asset, in the main currency, at a given time. */
export type PriceRecord = {
  id?: number
  /** The priced asset's full asset id. */
  priceKey: string
  /**
   * The asset's symbol, kept so that copies of the asset on other networks
   * can be valued by symbol.
   */
  symbol: string
  time: number
  value: number
  source: "live" | "backfill"
}

/**
 * A recorded balance of an asset for an account, in the asset's units, at a
 * given time.
 */
export type BalanceRecord = {
  id?: number
  /**
   * The key of the series this record belongs to, in the form
   * `${address}|${assetID}`; see {@link holdingKeyFor}.
   */
  holdingKey: string
  address: string
  chainID: string
  /** The asset's full asset id, which also keys its prices. */
  assetID: string
  symbol: string
  /**
   * Whether the asset was trusted when the balance was measured. Value totals
   * across assets only count trusted assets.
   */
  trusted: boolean
  time: number
  value: number
  source: "live" | "backfill"
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
   * Set when the source can't serve the series at all, in which case backfill
   * doesn't attempt it.
   */
  unavailable?: boolean
  /**
   * After a failure such as a rate limit, the time before which backfill
   * won't try the series again.
   */
  notBefore?: number
  failures?: number
}

/** Extracts the times from a list of `[series+time]` compound index keys. */
const timesOf = (keys: unknown[]): number[] =>
  keys.flatMap((key) =>
    Array.isArray(key) && typeof key[1] === "number" ? [key[1]] : [],
  )

/** The window within which live balances keep at most one point per series. */
export const LIVE_BALANCE_SPACING = 5 * MINUTE

export const holdingKeyFor = (address: string, assetID: string): string =>
  `${address.toLowerCase()}|${assetID}`

/**
 * The HistoryDatabase stores compact, chartable history of prices and
 * balances. Each record is a single number for one series at one time, and
 * records are kept at decreasing resolution as they age, per the retention
 * tiers used by {@link compactableIndexes}.
 */
export class HistoryDatabase extends Dexie {
  private prices!: Dexie.Table<PriceRecord, number>

  private balances!: Dexie.Table<BalanceRecord, number>

  private backfill!: Dexie.Table<BackfillState, string>

  /**
   * Each holding's latest balance record, keyed by holding key. This table
   * lets the database find an account's holdings without reading its whole
   * balance history.
   */
  private holdings!: Dexie.Table<BalanceRecord, string>

  constructor(options?: DexieOptions) {
    super("tally/history", options)
    this.version(1).stores({
      prices: "++id,[priceKey+time],symbol,time",
      balances: "++id,[holdingKey+time],[address+chainID],address,time",
      backfill: "&key",
    })
    this.version(2)
      .stores({
        prices: "++id,[priceKey+time],[symbol+priceKey],time",
        balances: "++id,[holdingKey+time],address,time",
        backfill: "&key",
        holdings: "&holdingKey,address",
      })
      .upgrade(async (transaction) => {
        const latest = new Map<string, BalanceRecord>()
        await transaction
          .table<BalanceRecord, number>("balances")
          .each((record) => {
            const seen = latest.get(record.holdingKey)
            if (!seen || seen.time < record.time) {
              latest.set(record.holdingKey, record)
            }
          })
        await transaction
          .table<BalanceRecord, string>("holdings")
          .bulkPut([...latest.values()])

        // Version 1 backfill walked each series back a day at a time and
        // kept per-series progress, failure backoffs, and "unavailable"
        // marks that version 2 doesn't use. Its price marks reuse version
        // 2's keys, so an old "unavailable" mark would stop a price series
        // from ever being backfilled. Since progress is now read from the
        // data itself, clearing the table and starting over loses nothing.
        await transaction.table("backfill").clear()
      })
  }

  async addPrices(records: PriceRecord[]): Promise<void> {
    await this.prices.bulkAdd(records)
  }

  /**
   * Updates each holding's latest record in the holdings table from the
   * passed records, ignoring any that are older than the stored record.
   */
  private async noteHoldings(records: BalanceRecord[]): Promise<void> {
    const latest = new Map<string, BalanceRecord>()
    records.forEach((record) => {
      const seen = latest.get(record.holdingKey)
      if (!seen || seen.time < record.time)
        latest.set(record.holdingKey, record)
    })
    const candidates = [...latest.values()]
    const existing = await this.holdings.bulkGet(
      candidates.map(({ holdingKey }) => holdingKey),
    )
    const newer = candidates.filter(
      (record, index) =>
        existing[index] === undefined || existing[index].time < record.time,
    )
    if (newer.length > 0) {
      await this.holdings.bulkPut(newer.map(({ id: _, ...record }) => record))
    }
  }

  /**
   * Records live balances, skipping any that are no newer than their series'
   * latest point, or that repeat its value within an hour of it. Balances are
   * step functions, so a repeated value adds nothing but proof that the
   * balance held, and an hourly point is enough for that.
   *
   * A balance that changes every block, like an interest-bearing token's,
   * keeps one point per {@link LIVE_BALANCE_SPACING} window: if the latest
   * point is also live and falls in the same window, the new balance replaces
   * it. That way, the latest point is always current without storing a point
   * per block.
   *
   * The wallet reports all of an account's balances at once, and often, so
   * the batch is checked against the holdings table and written in a single
   * transaction rather than with a lookup and a write per balance.
   *
   * Returns the number of balances that were added or replaced.
   */
  async addLiveBalances(records: BalanceRecord[]): Promise<number> {
    const latestInBatch = new Map<string, BalanceRecord>()
    records.forEach((record) => {
      const seen = latestInBatch.get(record.holdingKey)
      if (!seen || seen.time < record.time) {
        latestInBatch.set(record.holdingKey, record)
      }
    })
    const candidates = [...latestInBatch.values()]

    return this.transaction("rw", this.balances, this.holdings, async () => {
      const latest = await this.holdings.bulkGet(
        candidates.map(({ holdingKey }) => holdingKey),
      )
      const added: BalanceRecord[] = []
      const replaced: BalanceRecord[] = []
      candidates.forEach((record, index) => {
        const known = latest[index]
        if (known === undefined) {
          // The wallet reports zero balances for every token it tracks, so
          // a holding starts with its first balance that isn't zero.
          if (record.value !== 0) added.push(record)
          return
        }
        if (
          record.time <= known.time ||
          (record.value === known.value && record.time - known.time < HOUR)
        ) {
          return
        }
        if (
          known.id !== undefined &&
          known.source === "live" &&
          Math.floor(record.time / LIVE_BALANCE_SPACING) ===
            Math.floor(known.time / LIVE_BALANCE_SPACING)
        ) {
          replaced.push({ ...record, id: known.id })
        } else {
          added.push(record)
        }
      })

      const addedIDs =
        added.length > 0
          ? await this.balances.bulkAdd(
              added.map(({ id: _, ...record }) => record),
              { allKeys: true },
            )
          : []
      if (replaced.length > 0) await this.balances.bulkPut(replaced)
      // Holdings keep the id of their latest point so that a later balance
      // in the same window can replace it.
      await this.holdings.bulkPut([
        ...added.map((record, index) => ({ ...record, id: addedIDs[index] })),
        ...replaced,
      ])
      return added.length + replaced.length
    })
  }

  async addBalance(record: BalanceRecord): Promise<void> {
    await this.addLiveBalances([record])
  }

  async addBalances(records: BalanceRecord[]): Promise<void> {
    await this.balances.bulkAdd(records)
    await this.noteHoldings(records)
  }

  /**
   * Returns a series' points between `from` and `to`, inclusive, plus the
   * last point before `from`, so that a step function's value at `from` is
   * known.
   */
  private async seriesPoints<T extends { time: number; value: number }>(
    table: Dexie.Table<T, number>,
    index: string,
    key: string,
    from: number,
    to: number,
  ): Promise<T[]> {
    const [before, within] = await Promise.all([
      table
        .where(index)
        .between([key, Dexie.minKey], [key, from], true, false)
        .last(),
      table.where(index).between([key, from], [key, to], true, true).toArray(),
    ])
    return before ? [before, ...within] : within
  }

  async getPriceSeries(
    priceKey: string,
    from: number,
    to: number,
  ): Promise<HistoryPoint[]> {
    const points = await this.seriesPoints(
      this.prices,
      "[priceKey+time]",
      priceKey,
      from,
      to,
    )
    return points.map(({ time, value }) => ({ time, value }))
  }

  /**
   * Returns the price keys recorded for a symbol, which are used to value
   * assets by symbol. Note that this reads only the index, not the prices
   * themselves.
   */
  async getPriceKeysForSymbol(symbol: string): Promise<string[]> {
    const keys = await this.prices
      .where("[symbol+priceKey]")
      .between([symbol, Dexie.minKey], [symbol, Dexie.maxKey])
      .uniqueKeys()
    return keys.flatMap((key) =>
      Array.isArray(key) && typeof key[1] === "string" ? [key[1]] : [],
    )
  }

  async getEarliestPriceTime(priceKey: string): Promise<number | undefined> {
    const first = await this.prices
      .where("[priceKey+time]")
      .between([priceKey, Dexie.minKey], [priceKey, Dexie.maxKey])
      .first()
    return first?.time
  }

  async getPriceTimes(
    priceKey: string,
    from: number,
    to: number,
  ): Promise<number[]> {
    return timesOf(
      await this.prices
        .where("[priceKey+time]")
        .between([priceKey, from], [priceKey, to], true, true)
        .keys(),
    )
  }

  /**
   * Returns the distinct holdings recorded for the given account addresses,
   * each as its latest balance record.
   */
  async getHoldings(addresses: string[]): Promise<BalanceRecord[]> {
    return this.holdings
      .where("address")
      .anyOf(addresses.map((address) => address.toLowerCase()))
      .toArray()
  }

  async getBalanceSeries(
    holdingKey: string,
    from: number,
    to: number,
  ): Promise<{ points: HistoryPoint[]; trusted: boolean }> {
    const records = await this.seriesPoints(
      this.balances,
      "[holdingKey+time]",
      holdingKey,
      from,
      to,
    )
    return {
      points: records.map(({ time, value }) => ({ time, value })),
      trusted: records.some(({ trusted }) => trusted),
    }
  }

  async getEarliestBalanceTime(
    holdingKey: string,
  ): Promise<number | undefined> {
    const first = await this.balances
      .where("[holdingKey+time]")
      .between([holdingKey, Dexie.minKey], [holdingKey, Dexie.maxKey])
      .first()
    return first?.time
  }

  async getBalanceTimes(
    holdingKey: string,
    from: number,
    to: number,
  ): Promise<number[]> {
    return timesOf(
      await this.balances
        .where("[holdingKey+time]")
        .between([holdingKey, from], [holdingKey, to], true, true)
        .keys(),
    )
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
   */
  async compact(now: number): Promise<number> {
    // Only the series index's keys and their records' ids are read, so that
    // compaction never has to load whole records.
    const compactTable = async (
      table: Dexie.Table<{ time: number }, number>,
      index: string,
    ) => {
      const collection = table.orderBy(index)
      const [keys, ids] = await Promise.all([
        collection.keys(),
        collection.primaryKeys(),
      ])
      const bySeries = new Map<unknown, { id: number; time: number }[]>()
      keys.forEach((key, position) => {
        if (!Array.isArray(key) || typeof key[1] !== "number") return
        const series = bySeries.get(key[0]) ?? []
        series.push({ id: ids[position], time: key[1] })
        bySeries.set(key[0], series)
      })
      const toDelete = [...bySeries.values()].flatMap((series) =>
        compactableIndexes(
          series.map(({ time }) => time),
          now,
        ).map((position) => series[position].id),
      )
      await table.bulkDelete(toDelete)
      return toDelete.length
    }

    const [prices, balances] = await Promise.all([
      compactTable(this.prices, "[priceKey+time]"),
      compactTable(this.balances, "[holdingKey+time]"),
    ])
    return prices + balances
  }
}

export async function getOrCreateDB(): Promise<HistoryDatabase> {
  return new HistoryDatabase()
}
