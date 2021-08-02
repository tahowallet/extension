import Dexie from "dexie"

import { TokenList } from "@uniswap/token-lists"
import {
  AnyAsset,
  FungibleAsset,
  Network,
  PricePoint,
  TokenListCitation,
} from "../../types"

export type IndexedPricePoint = PricePoint & {
  asset1ID: string
  asset2ID: string
}

export type PriceMeasurement = IndexedPricePoint & {
  retrievedAt: number
  provenance: string
  exchange?: string
}

export interface AccountBalance {
  account: string
  asset: FungibleAsset
  network: Network
  blockHeight?: BigInt
  retrievedAt: number
  provenance: string
}

export type CachedTokenList = TokenListCitation & {
  retrievedAt: number
  list: TokenList
}

export interface Migration {
  id: number
  appliedAt: number
}

/*
 * A rough attempt at canonical IDs for assets. Doing this well is tough without
 * either centrally managed IDs, or going full semantic / ontology.
 */
function assetID(asset: AnyAsset): string {
  const id = `${asset.symbol}`
  if (!("contractAddress" in asset)) {
    return id
  }
  const network = asset.homeNetwork
  return `${id}/${asset.contractAddress}/${network.family}/${network.name}`
}

/*
 * Normalize price points for consistent comparison and database indexing.
 */
function normalizePricePoint(pricePoint: PricePoint): IndexedPricePoint {
  // symbol/contractAddress/home-network-family/home-network-name
  const asset1ID = assetID(pricePoint.pair[0])
  const asset2ID = assetID(pricePoint.pair[1])
  return asset1ID.localeCompare(asset2ID) > 0
    ? {
        ...pricePoint,
        asset1ID,
        asset2ID,
      }
    : {
        time: pricePoint.time,
        pair: [pricePoint.pair[1], pricePoint.pair[0]],
        amounts: [pricePoint.amounts[1], pricePoint.amounts[0]],
        asset1ID: asset2ID,
        asset2ID: asset1ID,
      }
}

function numberArrayCompare(arr1: number[], arr2: number[]) {
  for (let i = 0; i < arr1.length; i += 1) {
    if (arr1[i] > arr2[i]) {
      return 1
    }
    if (arr1[i] < arr2[i]) {
      return -1
    }
  }
  return 0
}

export class IndexingDatabase extends Dexie {
  prices: Dexie.Table<PriceMeasurement, number>

  balances: Dexie.Table<AccountBalance, number>

  tokenLists: Dexie.Table<CachedTokenList, number>

  migrations: Dexie.Table<Migration, number>

  constructor() {
    super("tally/indexing")
    this.version(1).stores({
      migrations: "++id,appliedAt",
      prices: "++id,time,[asset1ID+asset2ID]",
      balances:
        "++id,account,asset.symbol,network.name,blockHeight,retrievedAt",
      tokenLists: "++id,url,retrievedAt",
    })
  }

  async savePriceMeasurement(
    pricePoint: PricePoint,
    retrievedAt: number,
    provenance: string,
    exchange?: string
  ): Promise<void> {
    const measurement = {
      ...normalizePricePoint(pricePoint),
      retrievedAt,
      provenance,
      exchange,
    }
    await this.prices.add(measurement)
  }

  async getLatestTokenList(url: string) {
    const candidateLists = await this.tokenLists
      .where("url")
      .equals(url)
      .reverse()
      .sortBy("retrievedAt")
    if (candidateLists.length > 0) {
      return candidateLists[0]
    }
    return null
  }

  async saveTokenList(url: string, list: TokenList): Promise<void> {
    const cachedList = {
      name: list.name,
      logoURL: list.logoURI,
      url,
      retrievedAt: Date.now(),
      list,
    }
    await this.tokenLists.add(cachedList)
  }

  async getLatestTokenLists(urls: string[]) {
    const candidateLists = (await this.tokenLists
      .where("url")
      .anyOf(urls)
      .toArray()) as CachedTokenList[]
    return Object.entries(
      candidateLists.reduce((acc, cachedList) => {
        if (!(cachedList.url in acc)) {
          acc[cachedList.url] = cachedList.list
        } else {
          const orig = acc[cachedList.url]
          const origV = [
            orig.version.major,
            orig.version.minor,
            orig.version.patch,
          ]
          const cachedV = [
            cachedList.list.version.major,
            cachedList.list.version.minor,
            cachedList.list.version.patch,
          ]
          if (numberArrayCompare(origV, cachedV) < 0) {
            acc[cachedList.url] = cachedList.list
          }
        }
        return { ...acc }
      }, {})
    ).map(([k, v]) => ({
      url: k,
      tokenList: v as TokenList,
    }))
  }
}

export async function getDB(): Promise<IndexingDatabase> {
  return new IndexingDatabase()
}

export async function getOrCreateDB(): Promise<IndexingDatabase> {
  const db = await getDB()
  const numMigrations = await db.migrations.count()
  if (numMigrations === 0) {
    await db.transaction("rw", db.migrations, async () => {
      db.migrations.add({ id: 0, appliedAt: Date.now() })
      // TODO decide migrations before the initial release
    })
  }
  return db
}
