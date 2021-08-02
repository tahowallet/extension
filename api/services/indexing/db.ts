import Dexie from "dexie"

import { FungibleAsset, Network, AnyAsset, PricePoint } from "../../types"

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

export class IndexingDatabase extends Dexie {
  prices: Dexie.Table<PriceMeasurement, number>

  balances: Dexie.Table<AccountBalance, number>

  migrations: Dexie.Table<Migration, number>

  constructor() {
    super("tally/indexing")
    this.version(1).stores({
      migrations: "++id,appliedAt",
      prices: "time,[asset1ID+asset2ID]",
      balances: "account,asset.symbol,network.name,blockHeight,retrievedAt",
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
    this.prices.add(measurement)
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
