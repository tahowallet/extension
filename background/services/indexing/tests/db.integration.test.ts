import Dexie from "dexie"
import { IDBFactory } from "fake-indexeddb"
import { ETH, ETHEREUM, HOUR, MINUTE } from "../../../constants"
import type { PricePoint } from "../../../assets"
import {
  createAccountBalance,
  createPricePoint,
  createSmartContractAsset,
} from "../../../tests/factories"
import logger from "../../../lib/logger"
import { INDEXING_DATABASE_NAME, getOrCreateDb } from "../db"
import { seriesFromMeasurements } from "../history/upgrade"
import {
  LEGACY_INDEXING_DATABASE_NAME,
  databaseExists,
  deleteLegacyIndexingWhenIdle,
} from "../legacy-db"

const NOW = Date.UTC(2026, 10, 3, 12)
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const ETHER = 10n ** 18n

/**
 * Opens the legacy indexing database as version 6 left it, with a row per
 * balance and price measurement.
 */
function versionSix(): Dexie {
  const db = new Dexie(LEGACY_INDEXING_DATABASE_NAME)
  db.version(6).stores({
    prices: "++id,time,[asset1ID+asset2ID]",
    balances:
      "++id,address,assetAmount.amount,assetAmount.asset.symbol,network.name,blockHeight,retrievedAt",
    tokenLists: "++id,url,retrievedAt",
    customAssets:
      "&[contractAddress+homeNetwork.name],contractAddress,symbol,homeNetwork.chainID,homeNetwork.name",
    assetsToTrack:
      "&[contractAddress+homeNetwork.name],symbol,contractAddress,homeNetwork.family,homeNetwork.chainID,homeNetwork.name",
  })
  return db
}

const ethBalance = (retrievedAt: number, ether: bigint) =>
  createAccountBalance({
    address: ADDRESS,
    assetAmount: { asset: ETH, amount: ether * ETHER },
    retrievedAt,
  })

const usdcBalance = (retrievedAt: number, amount: bigint) =>
  createAccountBalance({
    address: ADDRESS,
    retrievedAt,
    assetAmount: {
      ...createAccountBalance().assetAmount,
      amount,
    },
  })

const ethPrice = (time: number, usd: number): PricePoint => ({
  ...createPricePoint(ETH, usd),
  time,
})

const legacyExists = () => databaseExists(LEGACY_INDEXING_DATABASE_NAME)

describe("Moving the legacy indexing database", () => {
  beforeEach(() => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    jest.spyOn(Date, "now").mockReturnValue(NOW)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("turns measurement rows into one series per balance and per price", async () => {
    const old = versionSix()
    await old.table("balances").bulkAdd([
      ethBalance(NOW - 3 * HOUR, 1n),
      // A repeat within the hour adds nothing, as live balances don't.
      ethBalance(NOW - 3 * HOUR + MINUTE, 1n),
      ethBalance(NOW - 2 * HOUR, 2n),
      // A token the wallet tracks but the account never held.
      usdcBalance(NOW - 2 * HOUR, 0n),
      // A token held once, then emptied.
      usdcBalance(NOW - 3 * HOUR, 0n),
      usdcBalance(NOW - 2 * HOUR, 5_000_000n),
      usdcBalance(NOW - HOUR, 0n),
    ])
    await old.table("prices").bulkAdd([
      // Prices stored in milliseconds, as the wallet's sources stamp them.
      ethPrice(NOW - 2 * HOUR, 2_000),
      // Too soon after the last price for live spacing to keep it.
      ethPrice(NOW - 2 * HOUR + MINUTE, 2_001),
      // A price in seconds, as its type documents.
      ethPrice((NOW - HOUR) / 1000, 2_100),
      // A price between two assets, which history doesn't keep.
      { pair: [ETH, ETH], amounts: [1n, 1n], time: NOW - HOUR },
    ])
    const asset = createSmartContractAsset()
    await old.table("customAssets").add(asset)
    await old.table("assetsToTrack").add(asset)
    await old.table("tokenLists").add({
      url: "https://tokens.example.com",
      retrievedAt: NOW - HOUR,
      list: { name: "Example", tokens: [] },
    })
    old.close()

    const db = await getOrCreateDb()
    expect(db.name).toBe(INDEXING_DATABASE_NAME)
    expect(await db.table("customAssets").toArray()).toEqual([asset])
    expect(await db.table("assetsToTrack").toArray()).toEqual([asset])
    expect(await db.table("tokenLists").toArray()).toEqual([
      expect.objectContaining({ url: "https://tokens.example.com" }),
    ])

    const series = await db.getBalanceSeries([ADDRESS])
    const points = (assetID: string) => {
      const found = series.find((each) => each.assetID === assetID)
      return Array.from(found?.times ?? [], (time, index) => ({
        time,
        value: found?.values[index],
      }))
    }
    expect(series).toHaveLength(2)
    expect(points(`${ETHEREUM.chainID}/base`)).toEqual([
      { time: NOW - 3 * HOUR, value: 1 },
      { time: NOW - 2 * HOUR, value: 2 },
    ])
    expect(points(`${ETHEREUM.chainID}/${USDC}`)).toEqual([
      { time: NOW - 2 * HOUR, value: 5 },
      { time: NOW - HOUR, value: 0 },
    ])
    // Converted points count as live ones.
    expect(
      series.every(({ origins }) =>
        Array.from(origins ?? []).every((origin) => origin === 0),
      ),
    ).toBe(true)

    const prices = await db.getPriceSeries([`${ETHEREUM.chainID}/base`])
    const eth = prices.get(`${ETHEREUM.chainID}/base`)
    expect(Array.from(eth?.times ?? [])).toEqual([NOW - 2 * HOUR, NOW - HOUR])
    expect(Array.from(eth?.values ?? [])).toEqual([2_000, 2_100])
    expect((await db.getPricedAssetIDsBySymbol()).get("ETH")).toEqual([
      `${ETHEREUM.chainID}/base`,
    ])

    expect(await db.table("balances").count()).toBe(2)
    expect(await db.table("prices").count()).toBe(1)
    // The legacy database is left for an idle moment.
    expect(await legacyExists()).toBe(true)
  })

  it("converts only the newest rows and drops the rest", async () => {
    const old = versionSix()
    // One price an hour, so live spacing keeps every one converted.
    await old
      .table("prices")
      .bulkAdd(
        Array.from({ length: 25 }, (_, index) =>
          ethPrice(NOW - (25 - index) * HOUR, 1_000 + index),
        ),
      )

    const {
      prices: [series],
    } = await seriesFromMeasurements(
      { balances: old.table("balances"), prices: old.table("prices") },
      NOW,
      10,
    )
    expect(Array.from(series.values)).toEqual(
      Array.from({ length: 10 }, (_, index) => 1_015 + index),
    )
  })

  it("keeps recording into converted series", async () => {
    const old = versionSix()
    await old.table("balances").add(ethBalance(NOW - 3 * HOUR, 1n))
    old.close()

    const db = await getOrCreateDb()
    await db.addBalances([ethBalance(NOW - HOUR, 3n)])

    const [series] = await db.getBalanceSeries([ADDRESS])
    expect(Array.from(series.values)).toEqual([1, 3])
    expect(await db.table("balances").count()).toBe(1)
  })

  it("moves the legacy database only once", async () => {
    const moved = await getOrCreateDb()
    await moved.addBalances([ethBalance(NOW - HOUR, 3n)])
    moved.close()
    // The legacy database is still there, as it is until the user is idle.
    const old = versionSix()
    await old.table("balances").add(ethBalance(NOW - 3 * HOUR, 1n))
    old.close()

    const db = await getOrCreateDb()
    const [series] = await db.getBalanceSeries([ADDRESS])
    expect(Array.from(series.values)).toEqual([3])
  })

  it("starts empty if the legacy database can't be read", async () => {
    const logError = jest.spyOn(logger, "error").mockImplementation(() => {})
    // A version this wallet never shipped.
    const old = new Dexie(LEGACY_INDEXING_DATABASE_NAME)
    old.version(8).stores({ balances: "++id,&key" })
    await old.open()
    old.close()

    const db = await getOrCreateDb()
    expect(await db.table("balances").count()).toBe(0)
    expect(logError).toHaveBeenCalled()
  })

  it("deletes the legacy database only while the user is idle", async () => {
    const old = versionSix()
    await old.table("balances").add(ethBalance(NOW - HOUR, 1n))
    old.close()
    await getOrCreateDb()

    expect(await deleteLegacyIndexingWhenIdle(async () => false)).toBe(false)
    expect(await legacyExists()).toBe(true)

    expect(await deleteLegacyIndexingWhenIdle(async () => true)).toBe(true)
    expect(await legacyExists()).toBe(false)
    // Once it's gone, there's nothing left to delete.
    expect(await deleteLegacyIndexingWhenIdle(async () => true)).toBe(false)
  })

  it("doesn't create a legacy database on a new install", async () => {
    await (await getOrCreateDb()).open()
    expect(await legacyExists()).toBe(false)
  })
})
