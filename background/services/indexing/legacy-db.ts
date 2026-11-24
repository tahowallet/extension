import Dexie, { DexieOptions } from "dexie"

import type { AccountBalance } from "../../accounts"
import type { PricePoint, SmartContractFungibleAsset } from "../../assets"
import type { DeepWriteable } from "../../types"
import { normalizeEVMAddress } from "../../lib/utils"
import { fixPolygonWETHIssue, polygonTokenListURL } from "./token-list-edit"
import { seriesFromMeasurements } from "./history/upgrade"
import type {
  CachedTokenList,
  CustomAsset,
  IndexingDatabaseContents,
} from "./db"

/** The name of the database the indexing service used before `taho/indexing`. */
export const LEGACY_INDEXING_DATABASE_NAME = "tally/indexing"

/**
 * The indexing database as the wallet kept it until it moved to
 * `taho/indexing`, with a row per balance and price measurement. It's only
 * opened to move its contents to the new database, and then deleted.
 */
class LegacyIndexingDatabase extends Dexie {
  balances!: Dexie.Table<AccountBalance & { id?: number }, number>

  prices!: Dexie.Table<PricePoint & { id?: number }, number>

  tokenLists!: Dexie.Table<CachedTokenList & { id?: number }, number>

  customAssets!: Dexie.Table<CustomAsset, [string, string]>

  assetsToTrack!: Dexie.Table<SmartContractFungibleAsset, [string, string]>

  constructor(options?: DexieOptions) {
    super(LEGACY_INDEXING_DATABASE_NAME, options)
    this.version(1).stores({
      migrations: "++id,appliedAt",
      prices: "++id,time,[asset1ID+asset2ID]",
      balances:
        "++id,address,assetAmount.amount,assetAmount.asset.symbol,network.name,blockHeight,retrievedAt",
      tokenLists: "++id,url,retrievedAt",
      customAssets:
        "&[contractAddress+homeNetwork.name],contractAddress,symbol,homeNetwork.chainId,homeNetwork.name",
      assetsToTrack:
        "&[contractAddress+homeNetwork.name],symbol,contractAddress,homeNetwork.family,homeNetwork.chainId,homeNetwork.name",
    })

    this.version(2).stores({
      migrations: null,
    })

    this.version(3).upgrade((tx) =>
      tx
        .table("tokenLists")
        .toCollection()
        .modify((storedTokenList: DeepWriteable<CachedTokenList>) => {
          if (storedTokenList.url === polygonTokenListURL) {
            // This is how migrations are expected to work
            // oxlint-disable-next-line no-param-reassign
            storedTokenList.list.tokens = fixPolygonWETHIssue(
              storedTokenList.list.tokens,
            )
          }
        }),
    )

    this.version(4).upgrade(async (tx) => {
      const seenAddresses = new Set<string>()

      const selectInvalidOrDuplicateRecords = (
        record: SmartContractFungibleAsset & {
          chainId?: unknown
          address?: string
        },
      ) => {
        const normalizedAddress = normalizeEVMAddress(record.contractAddress)
        // These properties are not included after parsing
        // external token lists
        const isInvalidFungibleAssetForNetwork =
          typeof record.chainId !== "undefined" &&
          typeof record.address !== "undefined"

        if (
          isInvalidFungibleAssetForNetwork ||
          seenAddresses.has(normalizedAddress)
        ) {
          return true
        }

        seenAddresses.add(normalizedAddress)

        return false
      }

      // Remove invalid records
      await tx
        .table("assetsToTrack")
        .filter(selectInvalidOrDuplicateRecords)
        .delete()

      await tx
        .table("customAssets")
        .filter(selectInvalidOrDuplicateRecords)
        .delete()

      const normalizeAssetAddress = (record: SmartContractFungibleAsset) => {
        Object.assign(record, {
          contractAddress: normalizeEVMAddress(record.contractAddress),
        })
      }

      // Normalize addresses
      await tx
        .table("assetsToTrack")
        .toCollection()
        .modify(normalizeAssetAddress)

      await tx
        .table("customAssets")
        .toCollection()
        .modify(normalizeAssetAddress)
    })

    // Fix incorrect index on "chainId"
    this.version(5).stores({
      customAssets:
        "&[contractAddress+homeNetwork.name],contractAddress,symbol,homeNetwork.chainID,homeNetwork.name",
      assetsToTrack:
        "&[contractAddress+homeNetwork.name],symbol,contractAddress,homeNetwork.family,homeNetwork.chainID,homeNetwork.name",
    })

    // Fix issue for discovery transaction hash
    this.version(6).upgrade((tx) =>
      tx
        .table("customAssets")
        .toCollection()
        .modify((customAsset: CustomAsset) => {
          // oxlint-disable-next-line no-param-reassign
          delete customAsset.metadata?.discoveryTxHash
        }),
    )
  }
}

/** Resolves to whether a database named `name` exists. */
export async function databaseExists(
  name: string,
  options?: DexieOptions,
): Promise<boolean> {
  try {
    const db = await new Dexie(name, { ...options, addons: [] }).open()
    db.close()
    return true
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchDatabaseError") {
      return false
    }
    throw error
  }
}

/**
 * Reads what the legacy indexing database holds that's worth keeping: token
 * lists, custom and tracked assets, and its newest balance and price
 * measurements as series. Older measurements are left behind; see
 * {@link seriesFromMeasurements}.
 */
export async function readLegacyIndexing(
  options?: DexieOptions,
): Promise<IndexingDatabaseContents> {
  const legacy = new LegacyIndexingDatabase(options)
  try {
    const [tokenLists, customAssets, assetsToTrack] = await Promise.all([
      legacy.tokenLists.toArray(),
      legacy.customAssets.toArray(),
      legacy.assetsToTrack.toArray(),
    ])
    const series = await seriesFromMeasurements(legacy)
    return {
      tokenLists: tokenLists.map(({ id: _id, ...list }) => list),
      customAssets,
      assetsToTrack,
      balances: series.balances,
      prices: series.prices,
    }
  } finally {
    legacy.close()
  }
}

/**
 * Deletes the legacy indexing database if the user is idle, and resolves to
 * whether it did.
 *
 * On Chrome's LevelDB storage, deleting a database with millions of rows
 * holds up every other database the wallet has for minutes, even after the
 * request to delete it succeeds, and emptying its tables first doesn't make
 * that shorter. So the delete waits until no one is using the wallet.
 */
export async function deleteLegacyIndexingWhenIdle(
  isIdle: () => Promise<boolean>,
  options?: DexieOptions,
): Promise<boolean> {
  if (!(await isIdle())) return false
  if (!(await databaseExists(LEGACY_INDEXING_DATABASE_NAME, options))) {
    return false
  }
  await new Dexie(LEGACY_INDEXING_DATABASE_NAME, options).delete()
  return true
}
