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

const price = (priceKey: string, time: number, value = 1) => ({
  priceKey,
  symbol: "ETH",
  time,
  value,
  source: "live" as const,
})

describe("HistoryDatabase", () => {
  let db: HistoryDatabase

  /** The test holding's balance series, as points. */
  const balances = async () => {
    const [holding] = await db.getHoldings([ADDRESS])
    return holding === undefined
      ? []
      : Array.from(holding.times, (time, index) => ({
          time,
          value: holding.values[index],
        }))
  }

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

    expect((await balances()).map(({ value }) => value)).toEqual([1, 2, 2])
  })

  it("keeps one live point per five minutes for a balance that keeps changing", async () => {
    // A balance that grows every block, reported in batches.
    await db.addLiveBalances([balance(NOW, 1)])
    await db.addLiveBalances([balance(NOW + MINUTE, 1.1)])
    await db.addLiveBalances([
      balance(NOW + 2 * MINUTE, 1.2),
      balance(NOW + 3 * MINUTE, 1.3),
    ])
    await db.addLiveBalances([balance(NOW + 6 * MINUTE, 1.4)])

    // The first five-minute window keeps only its latest value, and the next
    // window starts a new point.
    expect(await balances()).toEqual([
      { time: NOW + 3 * MINUTE, value: 1.3 },
      { time: NOW + 6 * MINUTE, value: 1.4 },
    ])
    const [holding] = await db.getHoldings([ADDRESS])
    expect(holding.value).toBe(1.4)
  })

  it("keeps whether a holding is trusted current without a new point", async () => {
    // A token recorded before its token list loaded, then trusted.
    await db.addLiveBalances([{ ...balance(NOW, 5), trusted: false }])
    await db.addLiveBalances([balance(NOW + MINUTE, 5)])

    const [holding] = await db.getHoldings([ADDRESS])
    expect(holding.trusted).toBe(true)
    expect(holding.times).toHaveLength(1)
  })

  it("doesn't replace backfilled points with live ones", async () => {
    await db.addBalances([{ ...balance(NOW, 1), source: "backfill" }])
    await db.addLiveBalances([balance(NOW + MINUTE, 2)])

    expect((await balances()).map(({ value }) => value)).toEqual([1, 2])
  })

  it("doesn't start a holding with a zero balance", async () => {
    // The wallet reports zero balances for tokens it tracks but nobody holds.
    await db.addLiveBalances([balance(NOW, 0)])
    expect(await db.getHoldings([ADDRESS])).toEqual([])

    // Once held, a drop back to zero is still recorded.
    await db.addLiveBalances([balance(NOW + HOUR, 3)])
    await db.addLiveBalances([balance(NOW + 2 * HOUR, 0)])
    expect((await balances()).map(({ value }) => value)).toEqual([3, 0])
  })

  it("merges backfilled history into a series in time order", async () => {
    await db.addBalance(balance(NOW, 5))
    await db.addBalances([balance(NOW - 30 * DAY, 1), balance(NOW - DAY, 3)])

    expect((await balances()).map(({ value }) => value)).toEqual([1, 3, 5])
    // The latest balance is still the live one.
    const [holding] = await db.getHoldings([ADDRESS.toUpperCase()])
    expect(holding.value).toBe(5)
    expect(holding.time).toBe(NOW)
  })

  it("compacts old points to their tiers", async () => {
    const hourStart = Math.floor((NOW - 2 * DAY) / HOUR) * HOUR
    await db.addBalances([
      balance(hourStart + 5 * MINUTE, 1),
      balance(hourStart + 50 * MINUTE, 2),
      balance(NOW - MINUTE, 3),
      balance(NOW - 2 * MINUTE, 4),
    ])
    await db.addPrices([
      price(ASSET_ID, hourStart + MINUTE),
      price(ASSET_ID, hourStart + 2 * MINUTE),
    ])

    expect(await db.compact(NOW)).toBe(3)
    // Two days back, one point is kept per hour; within the last day, one is
    // kept per five minutes.
    expect((await balances()).map(({ value }) => value)).toEqual([2, 3])
    const prices = await db.getPriceSeries([ASSET_ID])
    expect(Array.from(prices.get(ASSET_ID)?.times ?? [])).toEqual([
      hourStart + 2 * MINUTE,
    ])
  })

  it("compacts many series a page at a time", async () => {
    // More series than fit on one compaction page, each with two points in
    // the same hour two days back.
    const hourStart = Math.floor((NOW - 2 * DAY) / HOUR) * HOUR
    await db.addPrices(
      Array.from({ length: 250 }, (_, index) => [
        price(`1/0x${index}`, hourStart + MINUTE),
        price(`1/0x${index}`, hourStart + 2 * MINUTE),
      ]).flat(),
    )

    expect(await db.compact(NOW)).toBe(250)
  })

  it("reads price series in bulk and finds price keys by symbol", async () => {
    await db.addPrices([
      price("1/base", NOW - 2 * HOUR, 2_000),
      price("10/base", NOW - HOUR),
      price("1/base", NOW, 2_100),
    ])

    const prices = await db.getPriceSeries(["1/base", "137/base"])
    expect([...prices.keys()]).toEqual(["1/base"])
    expect(Array.from(prices.get("1/base")?.values ?? [])).toEqual([
      2_000, 2_100,
    ])

    const bySymbol = await db.getPriceKeysBySymbol()
    expect(bySymbol.get("ETH")?.sort()).toEqual(["1/base", "10/base"])
  })

  it("starts over from the unshipped version 2 layout", async () => {
    db.close()
    const v2 = new Dexie("tally/history")
    v2.version(2).stores({
      prices: "++id,[priceKey+time],[symbol+priceKey],time",
      balances: "++id,[holdingKey+time],address,time",
      backfill: "&key",
      holdings: "&holdingKey,address",
    })
    await v2.table("balances").bulkAdd([balance(NOW - DAY, 1)])
    await v2.table("backfill").put({ key: "price:1/base", failures: 3 })
    v2.close()

    const upgraded = new HistoryDatabase()
    expect(await upgraded.getHoldings([ADDRESS])).toEqual([])
    expect(await upgraded.getBackfillState("price:1/base")).toEqual({
      key: "price:1/base",
    })
    expect(upgraded.tables.map(({ name }) => name).sort()).toEqual([
      "backfill",
      "series",
    ])
  })
})
