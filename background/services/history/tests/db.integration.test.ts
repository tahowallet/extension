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

  describe("with points dated in the future", () => {
    // A live price whose milliseconds were taken for seconds, which dates it
    // to around the year 58800.
    const INFLATED = NOW * 1000

    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValue(NOW)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    /**
     * Stores a series' points as given, without the checks that writes apply,
     * as a history stored before those checks can hold them.
     */
    const storeRaw = async (key: string, times: number[], values: number[]) => {
      const series = db.table("series")
      const record = await series.get(key)
      await series.put({
        ...record,
        times: Float64Array.from(times),
        values: Float64Array.from(values),
        sources: new Uint8Array(times.length),
      })
    }

    it("drops prices dated well past now, but allows some clock skew", async () => {
      await db.addPrices([
        price(ASSET_ID, NOW - HOUR, 2_900),
        price(ASSET_ID, NOW + 10 * MINUTE, 2_948),
        price(ASSET_ID, INFLATED, 2_251),
        price(ASSET_ID, NaN, 1),
      ])

      const prices = await db.getPriceSeries([ASSET_ID])
      expect(Array.from(prices.get(ASSET_ID)?.times ?? [])).toEqual([
        NOW - HOUR,
        NOW + 10 * MINUTE,
      ])
    })

    it("doesn't create a series from future prices alone", async () => {
      await db.addPrices([price(ASSET_ID, INFLATED, 2_251)])

      expect((await db.getPriceSeries([ASSET_ID])).size).toBe(0)
    })

    it("drops future balances, live or backfilled", async () => {
      await db.addLiveBalances([balance(NOW - HOUR, 1)])
      expect(await db.addLiveBalances([balance(INFLATED, 2)])).toBe(0)
      await db.addBalances([{ ...balance(NOW + DAY, 3), source: "backfill" }])

      expect(await balances()).toEqual([{ time: NOW - HOUR, value: 1 }])
    })

    it("cleans future points out of existing series when compacting", async () => {
      // A history holding an inflated live price that was stored without the
      // write check. It sorts last, after newer real prices.
      await db.addPrices([
        price(ASSET_ID, NOW - 2 * HOUR, 2_900),
        price(ASSET_ID, NOW - HOUR, 2_948),
      ])
      await storeRaw(
        `price:${ASSET_ID}`,
        [NOW - 2 * HOUR, NOW - HOUR, INFLATED],
        [2_900, 2_948, 2_251],
      )
      let prices = await db.getPriceSeries([ASSET_ID])
      expect(
        new Date(prices.get(ASSET_ID)?.times[2] ?? 0).getUTCFullYear(),
      ).toBeGreaterThan(58000)

      expect(await db.compact(NOW)).toBe(1)

      prices = await db.getPriceSeries([ASSET_ID])
      expect(Array.from(prices.get(ASSET_ID)?.times ?? [])).toEqual([
        NOW - 2 * HOUR,
        NOW - HOUR,
      ])
      expect(Array.from(prices.get(ASSET_ID)?.values ?? [])).toEqual([
        2_900, 2_948,
      ])
    })

    it("lets a holding's live balance move again once its future point is cleaned", async () => {
      await db.addLiveBalances([balance(NOW - HOUR, 1)])
      const [holding] = await db.getHoldings([ADDRESS])
      await storeRaw(
        `balance:${holding.holdingKey}`,
        [NOW - HOUR, INFLATED],
        [1, 7],
      )

      // While the future point is latest, no live balance is newer.
      expect(await db.addLiveBalances([balance(NOW, 2)])).toBe(0)

      await db.compact(NOW)
      expect(await db.addLiveBalances([balance(NOW, 2)])).toBe(1)
      const [current] = await db.getHoldings([ADDRESS])
      expect({ time: current.time, value: current.value }).toEqual({
        time: NOW,
        value: 2,
      })
    })
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

describe("HistoryDatabase chain data removal", () => {
  const FORK_CHAIN_ID = "73571"
  let db: HistoryDatabase

  const holding = (chainID: string): BalanceRecord => ({
    ...balance(NOW - HOUR, 10),
    holdingKey: holdingKeyFor(ADDRESS, `${chainID}/base`),
    chainID,
    assetID: `${chainID}/base`,
  })

  /** Stores a balance series, price series and backfill state per chain. */
  const storeHistoryFor = async (chainID: string) => {
    await db.addBalances([holding(chainID)])
    await db.addPrices([price(`${chainID}/base`, NOW - HOUR, 3000)])
    await db.putBackfillState({ key: `balances:${chainID}`, floor: NOW })
    await db.putBackfillState({ key: `transfers:${chainID}:${ADDRESS}` })
    await db.putBackfillState({ key: `price:${chainID}/base`, failures: 1 })
  }

  beforeEach(async () => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = new HistoryDatabase()
    await storeHistoryFor("1")
    await storeHistoryFor(FORK_CHAIN_ID)
    // A chain whose ID starts like the fork's must survive its removal.
    await storeHistoryFor(`${FORK_CHAIN_ID}0`)
  })

  afterEach(() => db.close())

  it("finds every chain it holds history for", async () => {
    expect(await db.getChainIDsWithData()).toEqual(
      new Set(["1", FORK_CHAIN_ID, `${FORK_CHAIN_ID}0`]),
    )
  })

  it("removes a chain's series and backfill state, and nothing else", async () => {
    // A balance series, a price series, and three backfill states.
    expect(await db.removeChainData(FORK_CHAIN_ID)).toBe(5)

    expect(await db.getChainIDsWithData()).toEqual(
      new Set(["1", `${FORK_CHAIN_ID}0`]),
    )
    expect(
      (await db.getHoldings([ADDRESS])).map(({ chainID }) => chainID).sort(),
    ).toEqual(["1", `${FORK_CHAIN_ID}0`])
    expect(await db.getBackfillState(`balances:${FORK_CHAIN_ID}`)).toEqual({
      key: `balances:${FORK_CHAIN_ID}`,
    })
    expect(await db.getBackfillState("balances:1")).toEqual({
      key: "balances:1",
      floor: NOW,
    })
  })
})
