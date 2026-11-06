import Dexie from "dexie"
import { IDBFactory } from "fake-indexeddb"
import { ETH, ETHEREUM, HOUR, MINUTE } from "../../../constants"
import type { PricePoint } from "../../../assets"
import {
  createAccountBalance,
  createPricePoint,
} from "../../../tests/factories"
import { IndexingDatabase } from "../db"

const NOW = Date.UTC(2026, 10, 3, 12)
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
const ETHER = 10n ** 18n

/**
 * Opens the indexing database as version 6 left it, with a row per balance
 * and price measurement.
 */
function versionSix(): Dexie {
  const db = new Dexie("tally/indexing")
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

describe("IndexingDatabase upgrade to series", () => {
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
    old.close()

    const db = new IndexingDatabase()
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

    // No measurement row is left behind.
    expect(await db.table("balances").count()).toBe(2)
    expect(await db.table("prices").count()).toBe(1)
  })

  it("keeps recording into converted series", async () => {
    const old = versionSix()
    await old.table("balances").add(ethBalance(NOW - 3 * HOUR, 1n))
    old.close()

    const db = new IndexingDatabase()
    await db.addBalances([ethBalance(NOW - HOUR, 3n)])

    const [series] = await db.getBalanceSeries([ADDRESS])
    expect(Array.from(series.values)).toEqual([1, 3])
    expect(await db.table("balances").count()).toBe(1)
  })
})
