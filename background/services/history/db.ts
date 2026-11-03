import Dexie, { DexieOptions } from "dexie"
import { HOUR } from "../../constants"
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

  constructor(options?: DexieOptions) {
    super("tally/history", options)
    this.version(1).stores({
      prices: "++id,[priceKey+time],symbol,time",
      balances: "++id,[holdingKey+time],[address+chainID],address,time",
      backfill: "&key",
    })
  }

  async addPrices(records: PriceRecord[]): Promise<void> {
    await this.prices.bulkAdd(records)
  }

  /**
   * Records a balance unless it repeats the series' latest one from within
   * the last hour: balances are step functions, so repeats add nothing but
   * proof the balance held, which an hourly point gives.
   */
  async addBalance(record: BalanceRecord): Promise<void> {
    const latest = await this.balances
      .where("[holdingKey+time]")
      .between(
        [record.holdingKey, Dexie.minKey],
        [record.holdingKey, Dexie.maxKey],
      )
      .last()
    if (
      latest &&
      latest.value === record.value &&
      record.time - latest.time < HOUR
    ) {
      return
    }
    await this.balances.add(record)
  }

  async addBalances(records: BalanceRecord[]): Promise<void> {
    await this.balances.bulkAdd(records)
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

  /** The price keys recorded for a symbol, for valuing by symbol. */
  async getPriceKeysForSymbol(symbol: string): Promise<string[]> {
    const keys = await this.prices.where("symbol").equals(symbol).keys()
    const records = await this.prices.bulkGet(keys as number[])
    return [
      ...new Set(
        records.flatMap((record) => (record ? [record.priceKey] : [])),
      ),
    ]
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
    const records = await this.prices
      .where("[priceKey+time]")
      .between([priceKey, from], [priceKey, to], true, true)
      .toArray()
    return records.map(({ time }) => time)
  }

  /**
   * Returns the distinct holdings recorded for the given account addresses,
   * each as its latest balance record.
   */
  async getHoldings(addresses: string[]): Promise<BalanceRecord[]> {
    const latestByHolding = new Map<string, BalanceRecord>()
    await this.balances
      .where("address")
      .anyOf(addresses.map((address) => address.toLowerCase()))
      .each((record) => {
        const seen = latestByHolding.get(record.holdingKey)
        if (!seen || seen.time < record.time) {
          latestByHolding.set(record.holdingKey, record)
        }
      })
    return [...latestByHolding.values()]
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
    const records = await this.balances
      .where("[holdingKey+time]")
      .between([holdingKey, from], [holdingKey, to], true, true)
      .toArray()
    return records.map(({ time }) => time)
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
    const compactTable = async <
      T extends { id?: number; time: number },
      K extends keyof T,
    >(
      table: Dexie.Table<T, number>,
      seriesKey: K,
    ) => {
      const bySeries = new Map<unknown, { id: number; time: number }[]>()
      await table.each((record) => {
        if (record.id === undefined) return
        const key = record[seriesKey]
        const series = bySeries.get(key) ?? []
        series.push({ id: record.id, time: record.time })
        bySeries.set(key, series)
      })
      const toDelete = [...bySeries.values()].flatMap((series) =>
        compactableIndexes(
          series.map(({ time }) => time),
          now,
        ).map((index) => series[index].id),
      )
      await table.bulkDelete(toDelete)
      return toDelete.length
    }

    const [prices, balances] = await Promise.all([
      compactTable(this.prices, "priceKey"),
      compactTable(this.balances, "holdingKey"),
    ])
    return prices + balances
  }
}

export async function getOrCreateDB(): Promise<HistoryDatabase> {
  return new HistoryDatabase()
}
