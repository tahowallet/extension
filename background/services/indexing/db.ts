import Dexie, { DexieOptions } from "dexie"
import { TokenList } from "@uniswap/token-lists"

import type { AccountBalance } from "../../accounts"
import { EVMNetwork } from "../../networks"
import {
  NetworkSpecificAssetMetadata,
  SmartContractFungibleAsset,
  TokenListCitation,
} from "../../assets"
import type { DeepWriteable } from "../../types"
import { fixPolygonWETHIssue, polygonTokenListURL } from "./token-list-edit"
import { normalizeEVMAddress } from "../../lib/utils"
import type { FullAssetID } from "../../redux-slices/utils/asset-utils"
import {
  BackfillRecord,
  BackfillState,
  BalanceMeasurement,
  BalanceSeries,
  BalanceSeriesRecord,
  PriceMeasurement,
  PriceSeriesRecord,
  SeriesRecord,
  backfillRecordKeyFor,
  balanceSeriesOf,
  compacted,
  emptyBalanceSeries,
  emptyPriceSeries,
  isRecordableTime,
  liveBalanceMeasurementOf,
  priceSeriesKeyFor,
  withLiveBalance,
  withPoints,
} from "./history/records"
import { Series } from "./history/series"
import { seriesFromMeasurements } from "./history/upgrade"

/**
 * How many series are read and rewritten in one transaction, by compaction
 * and by large writes. Batches yield to other work between them, so a large
 * history never holds up the background for long.
 */
const BATCH_SIZE = 100

/**
 * How many series compaction reads and rewrites at a time. Compaction rewrites
 * nearly every series it reads, which costs more per series than a write that
 * appends a point, so its pages are smaller to keep each one under 20ms.
 */
const COMPACTION_PAGE_SIZE = 30

/** Yields to other work in the background before continuing. */
const yieldToOtherWork = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

/**
 * Calls `work` with `items` {@link BATCH_SIZE} at a time, yielding to other
 * work between batches, and returns the sum of what each call returns.
 */
async function inBatches<T>(
  items: T[],
  work: (batch: T[]) => Promise<number>,
): Promise<number> {
  let total = 0
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    if (start > 0) {
      // oxlint-disable-next-line no-await-in-loop
      await yieldToOtherWork()
    }
    // oxlint-disable-next-line no-await-in-loop
    total += await work(items.slice(start, start + BATCH_SIZE))
  }
  return total
}

/** Groups items by a key, keeping their order. */
function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  items.forEach((item) => {
    const key = keyOf(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  })
  return groups
}

/*
 * CachedTokenList combines the specificty of TokenListCitation as a way to
 * reference a token list with actual token list, as well as a retrieval date.
 *
 * This detail will allow for disambiguation in case a token list publisher has
 * issues with backdating or improperly incremented version numbers.
 */
export type CachedTokenList = TokenListCitation & {
  retrievedAt: number
  list: TokenList
}

/*
 * CustomAsset provides the ability to mark an asset as removed in the database.
 * This state should only be stored in the db and not percolated to the user interface.
 * The UI sees the asset as actually removed but the db tracks that it once existed and was removed.
 * Used only for checking if an unverified, discovered (not added) asset should be added to the asset list.
 *
 */
type CustomAsset = Omit<SmartContractFungibleAsset, "metadata"> & {
  metadata?: NetworkSpecificAssetMetadata & { removed?: boolean }
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
  /**
   * Price history: one {@link PriceSeriesRecord} per asset, holding all of
   * the asset's prices in the main currency, plus a {@link BackfillRecord}
   * per asset whose price backfill has made progress or failed.
   */
  private prices!: Dexie.Table<PriceSeriesRecord | BackfillRecord, number>

  /**
   * Balance history: one {@link BalanceSeriesRecord} per account and asset,
   * plus a {@link BackfillRecord} per network for balance backfill and one
   * per account and network for reconstruction from transfers.
   */
  private balances!: Dexie.Table<BalanceSeriesRecord | BackfillRecord, number>

  /*
   * Cached token lists maintaining fungible asset metadata.
   */
  private tokenLists!: Dexie.Table<CachedTokenList, number>

  /*
   * User- and contract-supplied fungible asset metadata.
   */
  private customAssets!: Dexie.Table<CustomAsset, number>

  /*
   * Tokens whose balances should be checked periodically. It might make sense
   * for this to be tracked against particular accounts in the future.
   */
  private assetsToTrack!: Dexie.Table<
    SmartContractFungibleAsset,
    [string, string]
  >

  constructor(options?: DexieOptions) {
    super("tally/indexing", options)
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

    // Keep each balance and price series in a single record rather than a
    // row per measurement. IndexedDB is slow at many small reads and fast at
    // copying typed arrays, so a chart reads a few hundred records instead of
    // tens of thousands of rows. Dexie can't change a table's primary key, so
    // records keep their numeric ids and are found by their unique `key`.
    this.version(7)
      .stores({
        balances: "++id,&key,address,chainID",
        prices: "++id,&key,[symbol+key]",
      })
      .upgrade((tx) => seriesFromMeasurements(tx))
  }

  /**
   * Records prices, merging each into its asset's price series. A price at
   * the same time as an existing one replaces it.
   *
   * Note that prices dated more than {@link FUTURE_TOLERANCE} ahead of now
   * are dropped, since their times can only be in the wrong unit.
   */
  async savePriceMeasurements(measurements: PriceMeasurement[]): Promise<void> {
    const now = Date.now()
    const kept = measurements.filter(({ time }) => isRecordableTime(time, now))
    if (kept.length === 0) return
    const byAssetID = groupBy(kept, ({ assetID }) => assetID)
    const ids = await this.seriesIDsFor(this.prices)
    await inBatches([...byAssetID.keys()], async (assetIDs) =>
      this.transaction("rw", this.prices, async () => {
        const existing = await this.seriesByKey(
          this.prices,
          ids,
          assetIDs.map(priceSeriesKeyFor),
        )
        await this.putSeries(
          this.prices,
          ids,
          assetIDs.map((assetID) => {
            const points = byAssetID.get(assetID) ?? []
            const record =
              existing.get(priceSeriesKeyFor(assetID)) ??
              emptyPriceSeries(assetID, points[0]?.symbol ?? "")
            return withPoints(record, points)
          }),
        )
        return assetIDs.length
      }),
    )
  }

  /**
   * Records account balances the wallet fetched as live balances; see
   * {@link addLiveBalanceMeasurements}. Returns the number of balances that
   * were added or replaced.
   */
  async addBalances(accountBalances: AccountBalance[]): Promise<number> {
    return this.addLiveBalanceMeasurements(
      accountBalances.map(liveBalanceMeasurementOf),
    )
  }

  /**
   * Records live balances, each as {@link withLiveBalance} decides: skipping
   * any that are no newer than their series' latest point or that repeat it
   * within an hour, and keeping one live point per
   * {@link LIVE_BALANCE_SPACING} window. Of several balances for one series,
   * only the latest is recorded.
   *
   * Balances dated more than {@link FUTURE_TOLERANCE} ahead of now are
   * dropped, as {@link savePriceMeasurements} drops prices.
   *
   * Returns the number of balances that were added or replaced.
   */
  async addLiveBalanceMeasurements(
    measurements: BalanceMeasurement[],
  ): Promise<number> {
    const now = Date.now()
    const latestInBatch = new Map<string, BalanceMeasurement>()
    measurements.forEach((measurement) => {
      if (!isRecordableTime(measurement.retrievedAt, now)) return
      const seen = latestInBatch.get(measurement.key)
      if (!seen || seen.retrievedAt < measurement.retrievedAt) {
        latestInBatch.set(measurement.key, measurement)
      }
    })
    const ids = await this.seriesIDsFor(this.balances)
    return inBatches([...latestInBatch.values()], async (candidates) =>
      this.transaction("rw", this.balances, async () => {
        const existing = await this.seriesByKey(
          this.balances,
          ids,
          candidates.map(({ key }) => key),
        )
        const updated = candidates.flatMap((measurement) => {
          const series = withLiveBalance(
            existing.get(measurement.key),
            measurement,
          )
          return series === undefined ? [] : [series]
        })
        if (updated.length > 0) {
          await this.putSeries(this.balances, ids, updated)
        }
        return updated.length
      }),
    )
  }

  /**
   * Records balances as given, merging each into its series and creating the
   * series if needed. Backfill uses this to fill in history, where zero
   * balances are as meaningful as any other. Balances dated more than
   * {@link FUTURE_TOLERANCE} ahead of now are dropped, as
   * {@link savePriceMeasurements} drops prices.
   */
  async addBalanceMeasurements(
    measurements: BalanceMeasurement[],
  ): Promise<void> {
    const now = Date.now()
    const kept = measurements.filter(({ retrievedAt }) =>
      isRecordableTime(retrievedAt, now),
    )
    if (kept.length === 0) return
    const byKey = groupBy(kept, ({ key }) => key)
    const ids = await this.seriesIDsFor(this.balances)
    await inBatches([...byKey.keys()], async (keys) =>
      this.transaction("rw", this.balances, async () => {
        const existing = await this.seriesByKey(this.balances, ids, keys)
        await this.putSeries(
          this.balances,
          ids,
          keys.map((key) => {
            const points = byKey.get(key) ?? []
            return withPoints(
              existing.get(key) ?? emptyBalanceSeries(points[0]),
              points.map(({ retrievedAt, value, origin }) => ({
                time: retrievedAt,
                value,
                origin,
              })),
            )
          }),
        )
        return keys.length
      }),
    )
  }

  /**
   * Returns the balance series recorded for the given account addresses,
   * each with all of its points.
   */
  async getBalanceSeries(addresses: string[]): Promise<BalanceSeries[]> {
    if (addresses.length === 0) return []
    const records = await this.balances
      .where("address")
      .anyOf(addresses.map((address) => address.toLowerCase()))
      .toArray()
    return records.flatMap((record) =>
      record.kind === "balance" ? [balanceSeriesOf(record)] : [],
    )
  }

  /**
   * Returns the price series for the given full asset ids, by asset id. Ids
   * with no recorded prices are left out.
   */
  async getPriceSeries(
    assetIDs: FullAssetID[],
  ): Promise<Map<FullAssetID, Series>> {
    const records = await this.seriesByKey(
      this.prices,
      await this.seriesIDsFor(this.prices),
      assetIDs.map(priceSeriesKeyFor),
    )
    const found = new Map<FullAssetID, Series>()
    assetIDs.forEach((assetID) => {
      const record = records.get(priceSeriesKeyFor(assetID))
      if (record !== undefined) {
        found.set(assetID, { times: record.times, values: record.values })
      }
    })
    return found
  }

  /**
   * Returns the full asset id of every asset with recorded prices, grouped by
   * the symbol its prices were recorded with, which is what valuing assets by
   * symbol needs. Note that this reads only an index, not the prices
   * themselves.
   */
  async getPricedAssetIDsBySymbol(): Promise<Map<string, FullAssetID[]>> {
    const keys = await this.prices.orderBy("[symbol+key]").keys()
    const bySymbol = new Map<string, FullAssetID[]>()
    keys.forEach((indexKey) => {
      if (!Array.isArray(indexKey)) return
      const [symbol, key]: unknown[] = indexKey
      if (typeof symbol !== "string" || typeof key !== "string") return
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const assetID = key.slice("price:".length) as FullAssetID
      const assetIDs = bySymbol.get(symbol)
      if (assetIDs) assetIDs.push(assetID)
      else bySymbol.set(symbol, [assetID])
    })
    return bySymbol
  }

  /**
   * Returns the backfill state with the given key, or a state with no
   * progress if none is stored.
   */
  async getBackfillState(key: string): Promise<BackfillState> {
    const record = await this.backfillTableFor(key)
      .where("key")
      .equals(backfillRecordKeyFor(key))
      .first()
    if (record === undefined || record.kind !== "backfill") return { key }
    const {
      id: _id,
      kind: _kind,
      key: _storedKey,
      ...state
    } = record as BackfillRecord & { id?: number }
    return { key, ...state }
  }

  /** Stores a backfill state, replacing any stored with the same key. */
  async putBackfillState({ key, ...state }: BackfillState): Promise<void> {
    const table = this.backfillTableFor(key)
    const storedKey = backfillRecordKeyFor(key)
    await this.transaction("rw", table, async () => {
      const existing = await table.where("key").equals(storedKey).primaryKeys()
      await table.put({
        ...state,
        kind: "backfill",
        key: storedKey,
        ...(existing[0] === undefined ? {} : { id: existing[0] }),
      })
    })
  }

  /**
   * Thins every price and balance series down to its retention tiers as of
   * `now`, and returns the number of points dropped.
   *
   * Points dated more than {@link FUTURE_TOLERANCE} after `now` are dropped
   * too. Writes refuse such points, but a history can still hold some that
   * were stored without that check, for example live prices whose
   * milliseconds were taken for seconds. Such a point sorts last forever and
   * stands in for its series' latest point, so dropping it here lets the
   * series move again.
   *
   * Series are read and rewritten {@link COMPACTION_PAGE_SIZE} at a time, with
   * a pause for other background work between pages, so compacting a large
   * history never holds up the background for long.
   */
  async compactHistory(now: number): Promise<number> {
    let dropped = 0
    const compactTable = async (
      table: Dexie.Table<SeriesRecord | BackfillRecord, number>,
    ) => {
      let after: number | undefined
      for (;;) {
        // oxlint-disable-next-line no-await-in-loop
        const page = (await (
          after === undefined
            ? table.orderBy(":id")
            : table.where(":id").above(after)
        )
          .limit(COMPACTION_PAGE_SIZE)
          .toArray()) as (SeriesRecord | BackfillRecord)[] & { id?: number }[]
        if (page.length === 0) return
        after = page[page.length - 1].id

        const thinned = page.flatMap((record) => {
          if (record.kind === "backfill") return []
          const result = compacted(record, now)
          dropped += result.dropped
          return result.dropped > 0 ? [result.record] : []
        })
        // oxlint-disable-next-line no-await-in-loop
        if (thinned.length > 0) await table.bulkPut(thinned)
        // oxlint-disable-next-line no-await-in-loop
        await yieldToOtherWork()
      }
    }
    await compactTable(this.prices)
    await compactTable(this.balances)
    return dropped
  }

  /**
   * Each table's record ids by key, loaded once from the `key` index and kept
   * current by {@link putSeries}. Records keep numeric ids, since Dexie can't
   * change a table's primary key, and reading a chart's hundreds of series by
   * id is much faster than walking the `key` index for them.
   *
   * Note that every series write waits for its table's ids before it starts,
   * so the ids are read before any write this class makes and stay complete.
   */
  #seriesIDs = new Map<string, Promise<Map<string, number>>>()

  private seriesIDsFor(
    table: Dexie.Table<SeriesRecord | BackfillRecord, number>,
  ): Promise<Map<string, number>> {
    let ids = this.#seriesIDs.get(table.name)
    if (ids === undefined) {
      const collection = table.orderBy("key")
      ids = Promise.all([collection.keys(), collection.primaryKeys()]).then(
        ([keys, primaryKeys]) =>
          new Map(
            keys.flatMap((key, index) =>
              typeof key === "string" ? [[key, primaryKeys[index]]] : [],
            ),
          ),
      )
      this.#seriesIDs.set(table.name, ids)
    }
    return ids
  }

  /**
   * Returns the series stored in `table` under the given keys, by key, with
   * their ids, so that writing one back replaces it.
   *
   * @param ids The table's record ids by key; see {@link seriesIDsFor}.
   */
  private async seriesByKey<T extends SeriesRecord>(
    table: Dexie.Table<T | BackfillRecord, number>,
    ids: Map<string, number>,
    keys: string[],
  ): Promise<Map<string, T>> {
    const records = await table.bulkGet(
      keys.flatMap((key) => {
        const id = ids.get(key)
        return id === undefined ? [] : [id]
      }),
    )
    const byKey = new Map<string, T>()
    records.forEach((record) => {
      if (record !== undefined && record.kind !== "backfill") {
        byKey.set(record.key, record)
      }
    })
    return byKey
  }

  /**
   * Stores series, replacing those read with their ids and adding the rest,
   * and records the ids of added series in `ids`.
   */
  private async putSeries<T extends SeriesRecord>(
    table: Dexie.Table<T | BackfillRecord, number>,
    ids: Map<string, number>,
    records: T[],
  ): Promise<void> {
    const stored = await table.bulkPut(records, { allKeys: true })
    records.forEach((record, index) => ids.set(record.key, stored[index]))
  }

  /**
   * Returns the table a backfill state is stored in: `prices` for an asset's
   * prices, and `balances` for everything else.
   */
  private backfillTableFor(
    key: string,
  ): Dexie.Table<SeriesRecord | BackfillRecord, number> {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return (
      key.startsWith("price:") ? this.prices : this.balances
    ) as Dexie.Table<SeriesRecord | BackfillRecord, number>
  }

  async addAssetToTrack(asset: SmartContractFungibleAsset): Promise<void> {
    this.assetsToTrack.put(asset)
  }

  async getAssetsToTrack(): Promise<SmartContractFungibleAsset[]> {
    // TODO move "assets to track" to expire over time and require a refresh
    // to keep from balance checking tons of irrelevant tokens
    // see https://github.com/tallycash/tally-extension/issues/136 for details
    return this.assetsToTrack.toArray()
  }

  async isTrackingAsset(asset: SmartContractFungibleAsset): Promise<boolean> {
    return (
      (await this.getTrackedAssetByAddressAndNetwork(
        asset.homeNetwork,
        asset.contractAddress,
      )) !== undefined
    )
  }

  async getAllCustomAssets(): Promise<CustomAsset[]> {
    return this.customAssets.toArray()
  }

  async getActiveCustomAssetsByNetworks(
    networks: EVMNetwork[],
  ): Promise<CustomAsset[]> {
    return (
      await this.customAssets
        .where("homeNetwork.chainID")
        .anyOf(networks.map((network) => network.chainID))
        .toArray()
    ).filter((asset) => asset?.metadata?.removed !== true)
  }

  async getRemovedCustomAssetsByNetworks(
    networks: EVMNetwork[],
  ): Promise<CustomAsset[]> {
    return (
      await this.customAssets
        .where("homeNetwork.chainID")
        .anyOf(networks.map((network) => network.chainID))
        .toArray()
    ).filter((asset) => asset?.metadata?.removed === true)
  }

  async getCustomAssetByAddressAndNetwork(
    network: EVMNetwork,
    contractAddress: string,
  ): Promise<CustomAsset | undefined> {
    return this.customAssets
      .where("[contractAddress+homeNetwork.name]")
      .equals([contractAddress, network.name])
      .first()
  }

  async getTrackedAssetByAddressAndNetwork(
    network: EVMNetwork,
    contractAddress: string,
  ): Promise<SmartContractFungibleAsset | undefined> {
    return this.assetsToTrack
      .where("[contractAddress+homeNetwork.name]")
      .equals([contractAddress, network.name])
      .first()
  }

  async addOrUpdateCustomAsset(
    asset: SmartContractFungibleAsset,
  ): Promise<void> {
    this.customAssets.put(asset)
  }

  async getLatestTokenList(url: string): Promise<CachedTokenList | null> {
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

  async getLatestTokenLists(
    urls: string[],
  ): Promise<{ url: string; tokenList: TokenList }[]> {
    const candidateLists = await this.tokenLists
      .where("url")
      .anyOf(urls)
      .toArray()
    return Object.entries(
      candidateLists.reduce(
        (acc, cachedList) => {
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
        },
        {} as { [url: string]: TokenList },
      ),
    ).map(([k, v]) => ({
      url: k,
      tokenList: v,
    }))
  }
}

export async function getOrCreateDb(
  options?: DexieOptions,
): Promise<IndexingDatabase> {
  return new IndexingDatabase(options)
}
