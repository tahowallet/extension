import { IDBFactory } from "fake-indexeddb"
import { DAY, HOUR, MINUTE } from "../../../constants"
import type { FullAssetID } from "../../../redux-slices/utils/asset-utils"
import { IndexingDatabase } from "../db"
import { BalanceMeasurement, balanceSeriesKeyFor } from "../history/records"

const NOW = Date.UTC(2026, 10, 3, 12)
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const ASSET_ID: FullAssetID = "1/base"

const balance = (retrievedAt: number, value: number): BalanceMeasurement => ({
  key: balanceSeriesKeyFor(ADDRESS, ASSET_ID),
  address: ADDRESS,
  chainID: "1",
  assetID: ASSET_ID,
  symbol: "ETH",
  trusted: true,
  retrievedAt,
  value,
  origin: "live",
})

const price = (assetID: FullAssetID, time: number, value = 1) => ({
  assetID,
  symbol: "ETH",
  time,
  value,
  origin: "live" as const,
})

describe("IndexingDatabase history", () => {
  let db: IndexingDatabase

  /** The test balance series' points. */
  const balances = async () => {
    const [series] = await db.getBalanceSeries([ADDRESS])
    return series === undefined
      ? []
      : Array.from(series.times, (time, index) => ({
          time,
          value: series.values[index],
        }))
  }

  beforeEach(() => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = new IndexingDatabase()
  })

  it("skips repeated balances within the hour", async () => {
    await db.addLiveBalanceMeasurements([balance(NOW - 50 * MINUTE, 1)])
    await db.addLiveBalanceMeasurements([balance(NOW - 40 * MINUTE, 1)])
    await db.addLiveBalanceMeasurements([balance(NOW - 30 * MINUTE, 2)])
    await db.addLiveBalanceMeasurements([balance(NOW + 40 * MINUTE, 2)])

    expect((await balances()).map(({ value }) => value)).toEqual([1, 2, 2])
  })

  it("keeps one live point per five minutes for a balance that keeps changing", async () => {
    // A balance that grows every block, reported in batches.
    await db.addLiveBalanceMeasurements([balance(NOW, 1)])
    await db.addLiveBalanceMeasurements([balance(NOW + MINUTE, 1.1)])
    await db.addLiveBalanceMeasurements([
      balance(NOW + 2 * MINUTE, 1.2),
      balance(NOW + 3 * MINUTE, 1.3),
    ])
    await db.addLiveBalanceMeasurements([balance(NOW + 6 * MINUTE, 1.4)])

    // The first five-minute window keeps only its latest value, and the next
    // window starts a new point.
    expect(await balances()).toEqual([
      { time: NOW + 3 * MINUTE, value: 1.3 },
      { time: NOW + 6 * MINUTE, value: 1.4 },
    ])
    const [series] = await db.getBalanceSeries([ADDRESS])
    expect(series.value).toBe(1.4)
  })

  it("keeps whether an asset is trusted current without a new point", async () => {
    // A token recorded before its token list loaded, then trusted.
    await db.addLiveBalanceMeasurements([
      { ...balance(NOW, 5), trusted: false },
    ])
    await db.addLiveBalanceMeasurements([balance(NOW + MINUTE, 5)])

    const [series] = await db.getBalanceSeries([ADDRESS])
    expect(series.trusted).toBe(true)
    expect(series.times).toHaveLength(1)
  })

  it("doesn't replace backfilled points with live ones", async () => {
    await db.addBalanceMeasurements([
      { ...balance(NOW, 1), origin: "backfill" },
    ])
    await db.addLiveBalanceMeasurements([balance(NOW + MINUTE, 2)])

    expect((await balances()).map(({ value }) => value)).toEqual([1, 2])
  })

  it("doesn't start a series with a zero balance", async () => {
    // The wallet reports zero balances for tokens it tracks but nobody holds.
    await db.addLiveBalanceMeasurements([balance(NOW, 0)])
    expect(await db.getBalanceSeries([ADDRESS])).toEqual([])

    // Once held, a drop back to zero is still recorded.
    await db.addLiveBalanceMeasurements([balance(NOW + HOUR, 3)])
    await db.addLiveBalanceMeasurements([balance(NOW + 2 * HOUR, 0)])
    expect((await balances()).map(({ value }) => value)).toEqual([3, 0])
  })

  it("merges backfilled history into a series in time order", async () => {
    await db.addLiveBalanceMeasurements([balance(NOW, 5)])
    await db.addBalanceMeasurements([
      balance(NOW - 30 * DAY, 1),
      balance(NOW - DAY, 3),
    ])

    expect((await balances()).map(({ value }) => value)).toEqual([1, 3, 5])
    // The latest balance is still the live one.
    const [series] = await db.getBalanceSeries([ADDRESS.toUpperCase()])
    expect(series.value).toBe(5)
    expect(series.retrievedAt).toBe(NOW)
  })

  it("compacts old points to their tiers", async () => {
    const hourStart = Math.floor((NOW - 2 * DAY) / HOUR) * HOUR
    await db.addBalanceMeasurements([
      balance(hourStart + 5 * MINUTE, 1),
      balance(hourStart + 50 * MINUTE, 2),
      balance(NOW - MINUTE, 3),
      balance(NOW - 2 * MINUTE, 4),
    ])
    await db.savePriceMeasurements([
      price(ASSET_ID, hourStart + MINUTE),
      price(ASSET_ID, hourStart + 2 * MINUTE),
    ])

    expect(await db.compactHistory(NOW)).toBe(3)
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
    await db.savePriceMeasurements(
      Array.from({ length: 250 }, (_, index): ReturnType<typeof price>[] => [
        price(`1/0x${index}`, hourStart + MINUTE),
        price(`1/0x${index}`, hourStart + 2 * MINUTE),
      ]).flat(),
    )

    expect(await db.compactHistory(NOW)).toBe(250)
  })

  it("reads price series in bulk and finds priced assets by symbol", async () => {
    await db.savePriceMeasurements([
      price("1/base", NOW - 2 * HOUR, 2_000),
      price("10/base", NOW - HOUR),
      price("1/base", NOW, 2_100),
    ])

    const prices = await db.getPriceSeries(["1/base", "137/base"])
    expect([...prices.keys()]).toEqual(["1/base"])
    expect(Array.from(prices.get("1/base")?.values ?? [])).toEqual([
      2_000, 2_100,
    ])

    const bySymbol = await db.getPricedAssetIDsBySymbol()
    expect(bySymbol.get("ETH")?.sort()).toEqual(["1/base", "10/base"])
  })

  it("keeps backfill states beside the series without mixing them in", async () => {
    await db.savePriceMeasurements([price(ASSET_ID, NOW)])
    await db.addLiveBalanceMeasurements([balance(NOW, 1)])
    await db.putBackfillState({ key: `price:${ASSET_ID}`, failures: 2 })
    await db.putBackfillState({ key: "balances:1", floor: NOW - DAY })
    await db.putBackfillState({ key: "balances:1", floor: NOW - 2 * DAY })

    expect(await db.getBackfillState(`price:${ASSET_ID}`)).toEqual({
      key: `price:${ASSET_ID}`,
      failures: 2,
    })
    expect(await db.getBackfillState("balances:1")).toEqual({
      key: "balances:1",
      floor: NOW - 2 * DAY,
    })
    expect(await db.getBackfillState("balances:10")).toEqual({
      key: "balances:10",
    })
    // Neither state shows up as a series, nor holds up compaction.
    expect(await db.getBalanceSeries([ADDRESS])).toHaveLength(1)
    expect((await db.getPricedAssetIDsBySymbol()).get("ETH")).toEqual([
      ASSET_ID,
    ])
    expect(await db.compactHistory(NOW)).toBe(0)
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
    const storeRaw = async (
      tableName: "balances" | "prices",
      key: string,
      times: number[],
      values: number[],
    ) => {
      const table = db.table(tableName)
      const record = await table.where("key").equals(key).first()
      await table.put({
        ...record,
        times: Float64Array.from(times),
        values: Float64Array.from(values),
        origins: new Uint8Array(times.length),
      })
    }

    it("drops prices dated well past now, but allows some clock skew", async () => {
      await db.savePriceMeasurements([
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
      await db.savePriceMeasurements([price(ASSET_ID, INFLATED, 2_251)])

      expect((await db.getPriceSeries([ASSET_ID])).size).toBe(0)
    })

    it("drops future balances, live or backfilled", async () => {
      await db.addLiveBalanceMeasurements([balance(NOW - HOUR, 1)])
      expect(await db.addLiveBalanceMeasurements([balance(INFLATED, 2)])).toBe(
        0,
      )
      await db.addBalanceMeasurements([
        { ...balance(NOW + DAY, 3), origin: "backfill" },
      ])

      expect(await balances()).toEqual([{ time: NOW - HOUR, value: 1 }])
    })

    it("cleans future points out of existing series when compacting", async () => {
      // A history holding an inflated live price that was stored without the
      // write check. It sorts last, after newer real prices.
      await db.savePriceMeasurements([
        price(ASSET_ID, NOW - 2 * HOUR, 2_900),
        price(ASSET_ID, NOW - HOUR, 2_948),
      ])
      await storeRaw(
        "prices",
        `price:${ASSET_ID}`,
        [NOW - 2 * HOUR, NOW - HOUR, INFLATED],
        [2_900, 2_948, 2_251],
      )
      let prices = await db.getPriceSeries([ASSET_ID])
      expect(
        new Date(prices.get(ASSET_ID)?.times[2] ?? 0).getUTCFullYear(),
      ).toBeGreaterThan(58000)

      expect(await db.compactHistory(NOW)).toBe(1)

      prices = await db.getPriceSeries([ASSET_ID])
      expect(Array.from(prices.get(ASSET_ID)?.times ?? [])).toEqual([
        NOW - 2 * HOUR,
        NOW - HOUR,
      ])
      expect(Array.from(prices.get(ASSET_ID)?.values ?? [])).toEqual([
        2_900, 2_948,
      ])
    })

    it("lets a live balance move again once its future point is cleaned", async () => {
      await db.addLiveBalanceMeasurements([balance(NOW - HOUR, 1)])
      const [series] = await db.getBalanceSeries([ADDRESS])
      await storeRaw("balances", series.key, [NOW - HOUR, INFLATED], [1, 7])

      // While the future point is latest, no live balance is newer.
      expect(await db.addLiveBalanceMeasurements([balance(NOW, 2)])).toBe(0)

      await db.compactHistory(NOW)
      expect(await db.addLiveBalanceMeasurements([balance(NOW, 2)])).toBe(1)
      const [current] = await db.getBalanceSeries([ADDRESS])
      expect({ time: current.retrievedAt, value: current.value }).toEqual({
        time: NOW,
        value: 2,
      })
    })
  })
})
