import logger from "../../../lib/logger"
import { DAY, TEST_NETWORK_BY_CHAIN_ID } from "../../../constants"
import type { AnyAsset } from "../../../assets"
import { isSmartContractFungibleAsset } from "../../../assets"
import type { EVMNetwork } from "../../../networks"
import {
  FullAssetID,
  getFullAssetID,
  isTrustedAsset,
} from "../../../redux-slices/utils/asset-utils"
import type { IndexingDatabase } from "../db"
import { BalanceSeriesInfo } from "./records"
import { firstHeldTime, HistoryPoint, Series, valueSeries } from "./series"
import { activeFloor } from "./backfill"

/**
 * Value history queries that take at least this long log a warning with
 * their per-phase timings.
 */
const SLOW_QUERY_MS = 1_000

/**
 * A query for value history: the accounts whose balances should be valued,
 * optionally limited to some networks or to one asset, over a span of time
 * sampled at `samples` points.
 */
export type ValueHistoryQuery = {
  addresses: string[]
  /** Limits the query to these networks. If absent, all are included. */
  chainIDs?: string[]
  /**
   * Limits the query to the asset with this full asset id. If absent, all
   * trusted assets are included.
   */
  assetID?: string
  /**
   * When the window starts, or `"start"` for when the queried accounts first
   * held anything: their earliest balance that isn't zero, so that before it,
   * every queried balance was empty on record.
   */
  from: number | "start"
  to: number
  samples: number
}

export type ValueHistory = {
  /** When the charted window starts, which a `"start"` query works out. */
  from: number
  points: HistoryPoint[]
  coverageStart: number | undefined
  /**
   * The last point whose value assumed some balance's earliest known value,
   * because its balance history doesn't reach back that far yet; see
   * {@link valueSeries}.
   */
  estimatedUntil: number | undefined
  /**
   * The latest time before which some queried network's balance history
   * isn't available at all, because none of its endpoints keep state that
   * old; `undefined` if every network's history reaches the window's start.
   * Values before it rely on estimates that backfill can't replace.
   */
  balanceHistoryFrom: number | undefined
  /**
   * The last point whose value relied on token balances reconstructed from
   * transfers, on networks whose endpoints keep no old state; `undefined` if
   * none did.
   */
  reconstructedUntil: number | undefined
  /**
   * Stretches whose values rely mostly on prices that weren't recorded,
   * typically while the wallet wasn't running; see {@link valueSeries}.
   */
  unrecorded: { from: number; to: number }[]
  /** Whether backfill still has work to do for any of the queried series. */
  backfilling: boolean
}

/**
 * Returns a function that says whether a balance series' asset is trusted
 * right now, the way the wallet decides it: base assets, assets on token
 * lists, and assets the user has verified. The answer comes from the given
 * networks' current asset data rather than from the series, whose copies of
 * an asset can lack the metadata that makes it trusted, such as a
 * verification made after the balance was recorded. Series on networks whose
 * assets aren't loaded yet fall back to what was recorded.
 *
 * @param cachedAssetsFor Returns a network's currently known assets.
 */
export function trustResolverFor(
  networks: EVMNetwork[],
  cachedAssetsFor: (network: EVMNetwork) => AnyAsset[],
): (series: BalanceSeriesInfo) => boolean {
  const trustedIDs = new Set<string>()
  const loadedChains = new Set<string>()
  networks.forEach((network) => {
    const assets = cachedAssetsFor(network)
    if (assets.length > 0) loadedChains.add(network.chainID)
    assets.forEach((asset) => {
      if (isSmartContractFungibleAsset(asset) && isTrustedAsset(asset)) {
        trustedIDs.add(getFullAssetID(asset).toLowerCase())
      }
    })
  })
  return (series) =>
    series.assetID.endsWith("/base") ||
    (loadedChains.has(series.chainID)
      ? trustedIDs.has(series.assetID.toLowerCase())
      : series.trusted)
}

/**
 * Returns the full asset id whose price history should be used to value an
 * asset, given the priced assets by symbol. Prices recorded for the asset's
 * own id are preferred, then, for trusted assets, prices for any asset with
 * the same symbol. If neither exists, the asset's id is used.
 *
 * This matches how the wallet prices assets. An untrusted asset is only
 * valued by prices recorded for it exactly, since anyone can deploy a token
 * that borrows another's symbol, and borrowing that token's price would value
 * it as if it were the real thing.
 */
function priceAssetIDFor(
  { assetID, symbol, trusted }: BalanceSeriesInfo,
  pricedAssetIDsBySymbol: Map<string, FullAssetID[]>,
): FullAssetID {
  if (!trusted) return assetID
  const sameSymbol = pricedAssetIDsBySymbol.get(symbol) ?? []
  return sameSymbol.includes(assetID) ? assetID : (sameSymbol[0] ?? assetID)
}

/**
 * Returns the value over time of the queried accounts' balances, sampled at
 * `samples` points across the queried span, along with when coverage starts
 * and whether backfill is still filling in the queried series.
 *
 * @param trustResolver Returns a function that says whether a series' asset
 *        is trusted right now; see {@link trustResolverFor}.
 * @param isBackfillPending Says whether a backfill state key still has
 *        backfill work to do.
 */
export async function valueHistory(
  query: ValueHistoryQuery,
  {
    db,
    trustResolver,
    isBackfillPending,
  }: {
    db: IndexingDatabase
    trustResolver: () => Promise<(series: BalanceSeriesInfo) => boolean>
    isBackfillPending: (key: string) => boolean
  },
): Promise<ValueHistory> {
  const { addresses, chainIDs, assetID, to, samples } = query
  const timings: Record<string, number> = {}
  let phaseStart = performance.now()
  const phase = (name: string) => {
    const now = performance.now()
    timings[name] = Math.round(now - phaseStart)
    phaseStart = now
  }

  // Each series comes with all of its points, a record per series, so
  // there's nothing more to read for balances.
  const [allSeries, pricedAssetIDsBySymbol, trusted] = await Promise.all([
    db.getBalanceSeries(addresses),
    db.getPricedAssetIDsBySymbol(),
    trustResolver(),
  ])
  const queried = allSeries
    .map((series) => ({ ...series, trusted: trusted(series) }))
    .filter(
      (series) =>
        // Test networks only count when a chart asks for them by network or
        // asset, as the wallet's own totals leave them out.
        (chainIDs === undefined
          ? !TEST_NETWORK_BY_CHAIN_ID.has(series.chainID)
          : chainIDs.includes(series.chainID)) &&
        (assetID === undefined ? series.trusted : series.assetID === assetID),
    )
  const from =
    query.from === "start" ? (firstHeldTime(queried) ?? to - DAY) : query.from
  const balanceSeries = queried.filter(
    // A balance that was already empty before the window adds nothing.
    (series) => !(series.value === 0 && series.retrievedAt <= from),
  )
  phase("balances")

  const valued = balanceSeries.map((series) => ({
    series,
    priceAssetID: priceAssetIDFor(series, pricedAssetIDsBySymbol),
  }))
  const prices = await db.getPriceSeries([
    ...new Set(valued.map(({ priceAssetID }) => priceAssetID)),
  ])
  phase("prices")

  const {
    points,
    coverageStart,
    estimatedUntil,
    reconstructedUntil,
    unrecorded,
  } = valueSeries({
    holdings: valued.map(({ series, priceAssetID }) => ({
      priceAssetID,
      balances: series,
    })),
    prices,
    from,
    to,
    samples,
    priceTolerance: DAY,
  })
  phase("values")

  const backfilling = balanceSeries.some(
    (series) =>
      isBackfillPending(`balances:${series.chainID}`) ||
      isBackfillPending(`price:${series.assetID}`),
  )

  const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0)
  if (total >= SLOW_QUERY_MS) {
    const pointCount = (series: Series[]) =>
      series.reduce((sum, { times }) => sum + times.length, 0)
    logger.warn(
      `Value history took ${total}ms for ${balanceSeries.length} balance series, ${prices.size} price series, ${pointCount(balanceSeries)} balance and ${pointCount([...prices.values()])} price points.`,
      timings,
    )
  }

  const now = Date.now()
  const floors = await Promise.all(
    [...new Set(balanceSeries.map(({ chainID }) => chainID))].map(
      async (chainID) =>
        activeFloor(await db.getBackfillState(`balances:${chainID}`), now),
    ),
  )
  const balanceHistoryFrom = floors
    .filter((floor): floor is number => floor !== undefined && floor > from)
    .reduce<number | undefined>(
      (latest, floor) => Math.max(latest ?? floor, floor),
      undefined,
    )

  return {
    from,
    points,
    coverageStart,
    estimatedUntil,
    balanceHistoryFrom,
    reconstructedUntil,
    unrecorded,
    backfilling,
  }
}
