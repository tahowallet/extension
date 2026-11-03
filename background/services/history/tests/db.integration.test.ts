import Dexie from "dexie"
import { IDBFactory } from "fake-indexeddb"
import { DAY, HOUR, MINUTE } from "../../../constants"
import { BalanceRecord, HistoryDatabase, holdingKeyFor } from "../db"

const NOW = Date.UTC(2026, 10, 3, 12)
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const ASSET_ID = "1/base"

const balance = (time: number, value: number): BalanceRecord => ({
  holdingKey: holdingKeyFor(ADDRESS, ASSET_ID),
  address: ADDRESS,
  chainID: "1",
  assetID: ASSET_ID,
  symbol: "ETH",
  trusted: true,
  time,
  value,
  source: "live",
})

describe("HistoryDatabase", () => {
  let db: HistoryDatabase

  beforeEach(() => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = new HistoryDatabase()
  })

  it("skips repeated balances within the hour", async () => {
    await db.addBalance(balance(NOW - 50 * MINUTE, 1))
    await db.addBalance(balance(NOW - 40 * MINUTE, 1))
    await db.addBalance(balance(NOW - 30 * MINUTE, 2))
    await db.addBalance(balance(NOW + 40 * MINUTE, 2))

    const { points } = await db.getBalanceSeries(
      holdingKeyFor(ADDRESS, ASSET_ID),
      0,
      NOW + HOUR,
    )
    expect(points.map(({ value }) => value)).toEqual([1, 2, 2])
  })

  it("reads a series with its last point before the window", async () => {
    await db.addBalances([
      balance(NOW - 3 * DAY, 1),
      balance(NOW - 2 * DAY, 2),
      balance(NOW - HOUR, 3),
    ])

    const { points, trusted } = await db.getBalanceSeries(
      holdingKeyFor(ADDRESS, ASSET_ID),
      NOW - DAY,
      NOW,
    )
    expect(points.map(({ value }) => value)).toEqual([2, 3])
    expect(trusted).toBe(true)
  })

  it("compacts old points to their tiers", async () => {
    const hourStart = Math.floor((NOW - 2 * DAY) / HOUR) * HOUR
    await db.addBalances([
      balance(hourStart + 5 * MINUTE, 1),
      balance(hourStart + 50 * MINUTE, 2),
      balance(NOW - MINUTE, 3),
      balance(NOW - 2 * MINUTE, 4),
    ])
    await db.addPrices(
      [hourStart + MINUTE, hourStart + 2 * MINUTE].map((time) => ({
        priceKey: ASSET_ID,
        symbol: "ETH",
        time,
        value: 2000,
        source: "live" as const,
      })),
    )

    expect(await db.compact(NOW)).toBe(2)
    const { points } = await db.getBalanceSeries(
      holdingKeyFor(ADDRESS, ASSET_ID),
      0,
      NOW,
    )
    expect(points.map(({ value }) => value)).toEqual([2, 4, 3])
  })

  it("lists holdings once each, with their latest record", async () => {
    await db.addBalances([balance(NOW - DAY, 1), balance(NOW, 5)])

    const holdings = await db.getHoldings([ADDRESS.toUpperCase()])
    expect(holdings).toHaveLength(1)
    expect(holdings[0].value).toBe(5)
  })

  it("keeps a holding's latest record when older history arrives", async () => {
    await db.addBalance(balance(NOW, 5))
    await db.addBalances([balance(NOW - 30 * DAY, 1)])

    const [holding] = await db.getHoldings([ADDRESS])
    expect(holding.value).toBe(5)
    expect(holding.time).toBe(NOW)
  })

  it("finds price keys by symbol and times by series", async () => {
    await db.addPrices(
      ["1/base", "10/base", "1/base"].map((priceKey, index) => ({
        priceKey,
        symbol: "ETH",
        time: NOW - index * HOUR,
        value: 1,
        source: "live" as const,
      })),
    )
    expect((await db.getPriceKeysForSymbol("ETH")).sort()).toEqual([
      "1/base",
      "10/base",
    ])
    expect(await db.getPriceTimes("1/base", 0, NOW)).toEqual([
      NOW - 2 * HOUR,
      NOW,
    ])
  })

  it("builds the holdings table from existing history on upgrade", async () => {
    db.close()
    // Set up a version 1 database, as it existed before the holdings table.
    const v1 = new Dexie("tally/history")
    v1.version(1).stores({
      prices: "++id,[priceKey+time],symbol,time",
      balances: "++id,[holdingKey+time],[address+chainID],address,time",
      backfill: "&key",
    })
    await v1.table("balances").bulkAdd([balance(NOW - DAY, 1), balance(NOW, 7)])
    v1.close()

    const upgraded = new HistoryDatabase()
    const holdings = await upgraded.getHoldings([ADDRESS])
    expect(holdings.map(({ value }) => value)).toEqual([7])
  })
})
