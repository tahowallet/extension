import browser from "webextension-polyfill"
import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import ChainService from "../chain"
import IndexingService from "../indexing"
import logger from "../../lib/logger"
import { AdaptiveSize } from "../../lib/adaptive-size"
import {
  BASE_ASSET_USD_FEEDS,
  CHAINLINK_AGGREGATOR_INTERFACE,
} from "../../lib/priceOracle"
import { DAY, MINUTE, TEST_NETWORK_BY_CHAIN_ID } from "../../constants"
import type { AccountBalance } from "../../accounts"
import type { PricePoint } from "../../assets"
import { isSmartContractFungibleAsset } from "../../assets"
import type { EVMNetwork } from "../../networks"
import {
  getFullAssetID,
  isTrustedAsset,
} from "../../redux-slices/utils/asset-utils"
import { normalizeEVMAddress } from "../../lib/utils"
import {
  BackfillState,
  Holding,
  HoldingInfo,
  HistoryDatabase,
  getOrCreateDB,
  holdingKeyFor,
} from "./db"
import { livePriceRecord } from "../indexing/history/live"
import {
  firstHeldTime,
  HistoryPoint,
  Series,
  valueSeries,
} from "../indexing/history/series"
import {
  BACKFILL_HORIZON,
  Bucket,
  missingBuckets,
} from "../indexing/history/schedule"
import { getAssetTransfersViaLogs } from "../../lib/erc20-transfer-logs"
import { balancesBefore } from "../indexing/history/reconstruction"
import {
  LogHistoryUnavailableError,
  LogScanPausedError,
} from "../chain/rpc/log-query-errors"
import { RateBudget } from "../indexing/history/budget"
import {
  BalanceRead,
  BlockClock,
  HistoryReader,
  CoinGeckoTarget,
  UnavailableError,
  fetchFeedPrice,
  fetchPriceHistory,
  multicallSizeFor,
  snapshotBalances,
} from "../indexing/history/sources"

/**
 * How far back CoinGecko's public API serves prices. This is set a day short
 * of the API's one-year limit so that a request at the edge isn't refused.
 *
 * Note that base assets can be backfilled further back than this using their
 * Chainlink feeds.
 */
const COINGECKO_REACH = 364 * DAY
/**
 * The span each CoinGecko price request covers. CoinGecko serves spans of
 * this size or less at hourly resolution.
 */
const COINGECKO_WINDOW = 90 * DAY

/**
 * The number of requests per minute backfill may make to each chain's
 * endpoints while the user is active and while they're away. A snapshot or
 * feed read on a chain costs two requests (a block lookup and the read
 * itself), so an active wallet makes one read every two minutes per chain,
 * and an idle one makes two a minute. At the idle rate, two years of history,
 * about 350 snapshots, takes about three hours to fill overnight.
 */
const RPC_RATES = { active: 1, idle: 4 }
const RPC_BURST = 4
const READ_COST = 2
/**
 * The number of requests per minute backfill may make to CoinGecko. These are
 * lower than the chain rates because CoinGecko is also used for live prices.
 */
const COINGECKO_RATES = { active: 0.5, idle: 2 }
const COINGECKO_BURST = 2

/**
 * Value history queries that take at least this long log a warning with
 * their per-phase timings.
 */
const SLOW_QUERY_MS = 1_000

/** Backfill ticks that take at least this long log a warning. */
const SLOW_TICK_MS = 5_000

/**
 * How many blocks one step of reconstructing token balances from transfers
 * covers. Common endpoint caps on log query ranges are 10,000 blocks or
 * more, and the log scan adapts to smaller ones.
 */
const RECONSTRUCTION_STEP_BLOCKS = 10_000

/** The minimum spacing between recorded live prices for each asset. */
const LIVE_PRICE_SPACING = 5 * MINUTE

/** Seconds without input after which Chrome reports the user idle. */
const IDLE_AFTER_SECONDS = 5 * 60

/**
 * How long a backfill floor is respected before backfill tries to reach past
 * it again.
 */
const FLOOR_RECHECK = DAY

/**
 * Checks whether the user is away using the browser's idle detection. If the
 * idle state can't be queried, the user is treated as active.
 */
async function isUserIdle(): Promise<boolean> {
  try {
    return (await browser.idle.queryState(IDLE_AFTER_SECONDS)) !== "active"
  } catch {
    return false
  }
}

/**
 * Returns a holding's balance at `time`: its latest point at or before it,
 * or failing that its earliest point.
 */
const balanceNear = ({ times, values }: Holding, time: number): number => {
  let found = 0
  for (
    let index = 0;
    index < times.length && times[index] <= time;
    index += 1
  ) {
    found = index
  }
  return values[found] ?? 0
}

/** Returns a holding's identifying information, without its series. */
const infoOf = ({
  holdingKey,
  address,
  chainID,
  assetID,
  symbol,
  trusted,
}: HoldingInfo): HoldingInfo => ({
  holdingKey,
  address,
  chainID,
  assetID,
  symbol,
  trusted,
})

/**
 * Returns the contract address from a holding's full asset id, or
 * `undefined` if the asset is a base asset.
 */
const contractAddressOf = (assetID: string): string | undefined =>
  assetID.endsWith("/base") ? undefined : assetID.split("/")[1]

/**
 * Returns a backfill state's floor, or `undefined` if it has none or the
 * floor is older than {@link FLOOR_RECHECK} and should be looked past again.
 */
const activeFloor = (state: BackfillState, now: number) =>
  state.floor !== undefined && now - (state.floorAt ?? 0) < FLOOR_RECHECK
    ? state.floor
    : undefined

/**
 * Checks whether a backfill state is waiting out a failure, in which case its
 * series shouldn't be attempted yet.
 */
const isResting = (state: BackfillState, now: number) =>
  (state.notBefore ?? 0) > now

/**
 * Returns the latest point in each of `buckets`, from points that may cover
 * more than the buckets do. Points outside every bucket are dropped.
 */
function latestPerBucket(
  points: HistoryPoint[],
  buckets: Bucket[],
): HistoryPoint[] {
  const latest = new Map<number, HistoryPoint>()
  points.forEach((point) => {
    const bucket = buckets.find(
      ({ start, size }) => point.time >= start && point.time < start + size,
    )
    if (!bucket) return
    const kept = latest.get(bucket.start)
    if (!kept || kept.time < point.time) latest.set(bucket.start, point)
  })
  return [...latest.values()]
}

/**
 * A query for value history: the accounts whose holdings should be valued,
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
   * When the window starts, or `"start"` for when the queried holdings were
   * first held: their earliest balance that isn't zero, so that before it,
   * every one of them was empty on record.
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
   * The last point whose value assumed some holding's earliest known balance,
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
 * The HistoryService keeps chartable history of prices and balances. It
 * records the prices and balances the wallet already fetches, thins them as
 * they age, and slowly backfills and infills what it missed, newest first,
 * out to two years.
 *
 * Each chain and CoinGecko get a small budget of requests per minute, which
 * is larger while the user is away. As a result, backfill trickles along
 * beside the wallet's own traffic during the day and catches up overnight.
 */
export default class HistoryService extends BaseService<ServiceLifecycleEvents> {
  static create: ServiceCreatorFunction<
    ServiceLifecycleEvents,
    HistoryService,
    [Promise<ChainService>, Promise<IndexingService>]
  > = async (chainService, indexingService) =>
    new this(await getOrCreateDB(), await chainService, await indexingService)

  private constructor(
    private db: HistoryDatabase,
    private chainService: ChainService,
    private indexingService: IndexingService,
  ) {
    super({
      historyCompaction: {
        schedule: { delayInMinutes: 5, periodInMinutes: 60 },
        handler: () => {
          void this.compact()
        },
      },
      historyBackfill: {
        schedule: { delayInMinutes: 2, periodInMinutes: 1 },
        handler: () => {
          void this.backfillTick()
        },
      },
    })
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.indexingService.emitter.on("prices", (pricePoints) => {
      void this.recordPrices(pricePoints)
    })
    this.indexingService.emitter.on("accountsWithBalances", ({ balances }) => {
      void this.recordBalances(balances)
    })
    this.chainService.emitter.on("accountsWithBalances", ({ balances }) => {
      void this.recordBalances(balances)
    })
  }

  /**
   * The time of the latest recorded live price for each price key, used to
   * space live prices out by {@link LIVE_PRICE_SPACING}.
   */
  #lastLivePriceAt = new Map<string, number>()

  private async recordPrices(pricePoints: PricePoint[]): Promise<void> {
    const records = pricePoints.flatMap((pricePoint) => {
      const record = livePriceRecord(pricePoint)
      return record === undefined ? [] : [record]
    })
    // Prices arrive every minute for every tracked asset, but history only
    // keeps one every few minutes per asset, which is all that compaction
    // would keep anyway.
    const kept = records.filter(({ priceKey, time }) => {
      const last = this.#lastLivePriceAt.get(priceKey)
      if (last !== undefined && time - last < LIVE_PRICE_SPACING) return false
      this.#lastLivePriceAt.set(priceKey, time)
      return true
    })
    if (kept.length > 0) await this.db.addPrices(kept)
  }

  private async recordBalances(balances: AccountBalance[]): Promise<void> {
    if (balances.length === 0) return
    await this.db.addLiveBalances(
      balances.map(({ address, network, assetAmount, retrievedAt }) => {
        const { asset, amount } = assetAmount
        const assetID = getFullAssetID(asset)
        return {
          holdingKey: holdingKeyFor(address, assetID),
          address: normalizeEVMAddress(address),
          chainID: network.chainID,
          assetID,
          symbol: asset.symbol,
          trusted: isTrustedAsset(asset),
          time: retrievedAt,
          value: Number(amount) / 10 ** asset.decimals,
          source: "live" as const,
        }
      }),
    )
  }

  private async compact(): Promise<void> {
    try {
      const dropped = await this.db.compact(Date.now())
      await this.indexingService.pruneRawHistory(Date.now() - 7 * DAY)
      logger.debug("History compacted", { dropped })
    } catch (error) {
      logger.warn("History compaction failed", error)
    }
  }

  /**
   * Returns a function that says whether a holding's asset is trusted right
   * now, the way the wallet decides it: base assets, assets on token lists,
   * and assets the user has verified. The answer comes from the indexing
   * service's current asset data rather than from the balance records, whose
   * copies of an asset can lack the metadata that makes it trusted, such as
   * a verification made after the balance was recorded. Holdings on networks
   * whose assets aren't loaded yet fall back to what was recorded.
   */
  private async trustResolver(): Promise<(holding: Holding) => boolean> {
    const networks = await this.chainService.getTrackedNetworks()
    const trustedIDs = new Set<string>()
    const loadedChains = new Set<string>()
    networks.forEach((network) => {
      const assets = this.indexingService.getCachedAssets(network)
      if (assets.length > 0) loadedChains.add(network.chainID)
      assets.forEach((asset) => {
        if (isSmartContractFungibleAsset(asset) && isTrustedAsset(asset)) {
          trustedIDs.add(getFullAssetID(asset).toLowerCase())
        }
      })
    })
    return (holding) =>
      holding.assetID.endsWith("/base") ||
      (loadedChains.has(holding.chainID)
        ? trustedIDs.has(holding.assetID.toLowerCase())
        : holding.trusted)
  }

  /**
   * Returns the price key whose history should be used to value an asset,
   * given the recorded price keys by symbol. Prices recorded for the asset's
   * own id are preferred, then, for trusted assets, prices for any asset with
   * the same symbol. If neither exists, the asset's id is used.
   *
   * This matches how the wallet prices assets. An untrusted asset is only
   * valued by prices recorded for it exactly, since anyone can deploy a
   * token that borrows another's symbol, and borrowing that token's price
   * would value it as if it were the real thing.
   */
  private static priceKeyFor(
    { assetID, symbol, trusted }: HoldingInfo,
    priceKeysBySymbol: Map<string, string[]>,
  ): string {
    if (!trusted) return assetID
    const sameSymbol = priceKeysBySymbol.get(symbol) ?? []
    return sameSymbol.includes(assetID) ? assetID : (sameSymbol[0] ?? assetID)
  }

  /**
   * Returns how CoinGecko identifies a held asset, or `undefined` if the
   * asset's network isn't tracked or CoinGecko has no id for the asset.
   */
  private async coinGeckoTargetFor(
    holding: HoldingInfo,
  ): Promise<CoinGeckoTarget | undefined> {
    const network = (await this.chainService.getTrackedNetworks()).find(
      ({ chainID }) => chainID === holding.chainID,
    )
    if (!network) return undefined
    if (holding.assetID.endsWith("/base")) {
      const coinID = network.baseAsset.metadata?.coinGeckoID
      return coinID ? { coinID } : undefined
    }
    const [, contractAddress] = holding.assetID.split("/")
    return network.coingeckoPlatformID && contractAddress
      ? { platformID: network.coingeckoPlatformID, contractAddress }
      : undefined
  }

  #clocks = new Map<string, BlockClock>()

  #multicallSizes = new Map<string, AdaptiveSize>()

  #budgets = new Map<string, RateBudget>()

  #feedDecimals = new Map<string, number>()

  #ticking = false

  /**
   * Whether each series still has backfill work, as of the last tick that
   * checked it, keyed by `balances:${chainID}` or `price:${assetID}`. Charts
   * read this rather than working it out from two years of a series'
   * history.
   */
  #pending = new Map<string, boolean>()

  private budgetFor(source: string): RateBudget {
    let budget = this.#budgets.get(source)
    if (!budget) {
      budget =
        source === "coingecko"
          ? new RateBudget(COINGECKO_RATES, COINGECKO_BURST)
          : new RateBudget(RPC_RATES, RPC_BURST)
      this.#budgets.set(source, budget)
    }
    return budget
  }

  /**
   * Returns the provider backfill may use for a network right now, or
   * `undefined` if the chain is unreachable or its endpoints are refusing
   * calls. In those cases, backfill waits rather than adding to the pile of
   * refused requests.
   */
  private readyProvider(network: EVMNetwork) {
    const provider = this.chainService.providerForNetwork(network)
    if (
      !provider ||
      provider.reachability === "unreachable" ||
      !provider.canServeNow("eth_call")
    ) {
      return undefined
    }
    return provider
  }

  /**
   * Returns a reader for a chain's past state. Calls at old blocks go through
   * {@link SerialFallbackProvider.historicalCall}, which asks each of the
   * chain's endpoints in turn, since often only some of them keep old state.
   */
  private static historyReader(
    provider: NonNullable<ReturnType<ChainService["providerForNetwork"]>>,
  ): HistoryReader {
    return {
      getBlock: (blockTag) => provider.getBlock(blockTag),
      call: (transaction, blockTag) =>
        provider.historicalCall(transaction, blockTag),
    }
  }

  private clockFor(network: EVMNetwork): BlockClock | undefined {
    const provider = this.readyProvider(network)
    if (!provider) return undefined
    let clock = this.#clocks.get(network.chainID)
    if (!clock) {
      clock = new BlockClock(provider)
      this.#clocks.set(network.chainID, clock)
    }
    return clock
  }

  /**
   * Records a failed backfill step for the given state. If the source has
   * nothing as old as `bucket`, signaled by an {@link UnavailableError}, the
   * end of the bucket is recorded as the series' floor. Any other failure
   * backs the series off exponentially.
   */
  private async recordFailure(
    state: BackfillState,
    error: unknown,
    bucket: Bucket,
    now: number,
  ): Promise<void> {
    if (error instanceof UnavailableError) {
      // Logged at info, since this stops backfill for the series until the
      // floor is rechecked, and the reason matters for any chart that shows it.
      logger.info(
        `History backfill for ${state.key} reaches no further back than ${new Date(bucket.start + bucket.size).toISOString()}: ${error.message}`,
      )
      await this.db.putBackfillState({
        ...state,
        floor: bucket.start + bucket.size,
        floorAt: now,
        failures: 0,
      })
      return
    }
    const failures = (state.failures ?? 0) + 1
    await this.db.putBackfillState({
      ...state,
      failures,
      // Back off exponentially, up to a day.
      notBefore: now + Math.min(DAY, 2 ** failures * MINUTE),
    })
    logger.debug(
      `History backfill step for ${state.key} failed ${failures} time(s) in a row: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  /**
   * Runs one step of balance backfill for each network and one step of price
   * backfill, each within its request budget. Each step fills the newest
   * missing history first, so the recent past fills in before backfill
   * reaches further back. Does nothing if a previous tick is still running.
   */
  async backfillTick(now = Date.now()): Promise<void> {
    if (this.#ticking) return
    this.#ticking = true
    const startedAt = performance.now()
    try {
      const idle = await isUserIdle()
      const accounts = await this.chainService.getAccountsToTrack()
      const trusted = await this.trustResolver()
      // Test networks are left out, as they are of the wallet's totals. Their
      // history isn't worth the requests it would take to backfill.
      const holdings = (
        await this.db.getHoldings(accounts.map(({ address }) => address))
      )
        .map((holding) => ({ ...holding, trusted: trusted(holding) }))
        .filter(
          (holding) =>
            holding.trusted && !TEST_NETWORK_BY_CHAIN_ID.has(holding.chainID),
        )
      const networks = await this.chainService.getTrackedNetworks()

      await Promise.all([
        ...networks.map((network) =>
          this.balanceStep(
            network,
            holdings.filter(({ chainID }) => chainID === network.chainID),
            now,
            idle,
          ),
        ),
        ...networks.map((network) =>
          this.reconstructionStep(
            network,
            holdings.filter(({ chainID }) => chainID === network.chainID),
            now,
            idle,
          ),
        ),
        this.priceStep(holdings, networks, now, idle),
      ])
    } catch (error) {
      logger.warn("History backfill tick failed", error)
    } finally {
      this.#ticking = false
      const elapsed = Math.round(performance.now() - startedAt)
      if (elapsed >= SLOW_TICK_MS) {
        logger.warn(`History backfill tick took ${elapsed}ms.`)
      }
    }
  }

  /**
   * Fills the newest bucket that any of a network's holdings is missing, with
   * a snapshot of every holding missing that bucket. A snapshot costs one
   * block lookup and, size limits permitting, one multicall, however many
   * accounts and tokens there are.
   */
  private async balanceStep(
    network: EVMNetwork,
    holdings: Holding[],
    now: number,
    idle: boolean,
  ): Promise<void> {
    if (holdings.length === 0) return
    const state = await this.db.getBackfillState(`balances:${network.chainID}`)
    if (isResting(state, now)) return
    const clock = this.clockFor(network)
    const provider = this.readyProvider(network)
    if (!clock || !provider) return

    const decimals = await this.decimalsByAsset()
    const floor = activeFloor(state, now)
    const missing = holdings.flatMap((holding) => {
      const contractAddress = contractAddressOf(holding.assetID)
      const holdingDecimals =
        contractAddress === undefined
          ? network.baseAsset.decimals
          : decimals.get(contractAddress.toLowerCase())
      if (holdingDecimals === undefined) return []
      return [
        {
          holding,
          contractAddress,
          holdingDecimals,
          buckets: missingBuckets(holding.times, now, { floor }),
        },
      ]
    })

    this.#pending.set(
      `balances:${network.chainID}`,
      missing.some(({ buckets }) => buckets.length > 0),
    )

    const target = missing
      .flatMap(({ buckets }) => buckets.slice(0, 1))
      .sort((a, b) => b.start - a.start)[0]
    if (!target) return
    if (!this.budgetFor(`rpc:${network.chainID}`).take(READ_COST, now, idle)) {
      return
    }

    const needing = missing.filter(({ buckets }) =>
      buckets.some(({ start }) => start === target.start),
    )
    try {
      const block = await clock.blockAt(target.start, now)
      let size = this.#multicallSizes.get(network.chainID)
      if (!size) {
        size = multicallSizeFor(network.chainID)
        this.#multicallSizes.set(network.chainID, size)
      }
      const reads: BalanceRead[] = needing.map(
        ({ holding, contractAddress }) => ({
          address: holding.address,
          contractAddress,
        }),
      )
      const amounts = await snapshotBalances(
        HistoryService.historyReader(provider),
        network.chainID,
        reads,
        block,
        size,
      )
      await this.db.addBalances(
        needing.map(({ holding, holdingDecimals }, index) => ({
          ...infoOf(holding),
          time: target.start,
          // A failed read means the token didn't exist yet or can't report
          // a balance; either way, nothing was held.
          value: Number(amounts[index] ?? 0n) / 10 ** holdingDecimals,
          source: "backfill" as const,
        })),
      )
      await this.db.putBackfillState({
        ...state,
        failures: 0,
        notBefore: undefined,
      })
    } catch (error) {
      await this.recordFailure(state, error, target, now)
    }
  }

  /**
   * On a network where no endpoint keeps state older than the balance floor,
   * reconstructs one account's token balances a step further back from its
   * token transfers: the balance at the start of a step is the balance at
   * its end, less the token's net transfers in between. Each step covers
   * {@link RECONSTRUCTION_STEP_BLOCKS} blocks of one account, picking the
   * account that has reached back least far, and records a point for each
   * of its token holdings.
   *
   * Only tokens are reconstructed. Every token balance change shows up as a
   * `Transfer` log, but base asset balances also move through gas fees and
   * contract-internal transfers that logs don't show, so base assets stay
   * estimated before the floor.
   *
   * Reconstruction stops at the backfill horizon, or where endpoints no
   * longer keep logs, which becomes its floor.
   */
  private async reconstructionStep(
    network: EVMNetwork,
    holdings: Holding[],
    now: number,
    idle: boolean,
  ): Promise<void> {
    const balanceState = await this.db.getBackfillState(
      `balances:${network.chainID}`,
    )
    const balanceFloor = activeFloor(balanceState, now)
    if (balanceFloor === undefined) return
    const tokens = holdings.filter(
      ({ assetID }) => contractAddressOf(assetID) !== undefined,
    )
    if (tokens.length === 0) return

    const clock = this.clockFor(network)
    const provider = this.readyProvider(network)
    if (!clock || !provider) return

    // The account that has reached back least far goes next.
    const accounts = await Promise.all(
      [...new Set(tokens.map(({ address }) => address))].map(
        async (address) => ({
          address,
          state: await this.db.getBackfillState(
            `transfers:${network.chainID}:${address}`,
          ),
        }),
      ),
    )
    const candidates = accounts.filter(
      ({ state }) =>
        !isResting(state, now) && activeFloor(state, now) === undefined,
    )
    const next = candidates.sort(
      (a, b) =>
        (b.state.reconstruction?.block ?? Infinity) -
        (a.state.reconstruction?.block ?? Infinity),
    )[0]
    if (!next) return
    const { address, state } = next
    const accountTokens = tokens.filter((token) => token.address === address)

    try {
      const toBlock =
        state.reconstruction?.block ?? (await clock.blockAt(balanceFloor, now))
      if ((await clock.timeOf(toBlock, now)) < now - BACKFILL_HORIZON) return
      if (
        !this.budgetFor(`rpc:${network.chainID}`).take(READ_COST, now, idle)
      ) {
        return
      }
      const fromBlock = Math.max(0, toBlock - RECONSTRUCTION_STEP_BLOCKS)
      const toTime = await clock.timeOf(toBlock, now)

      // Balances as of `toBlock`: carried over from the last step, or, for
      // the first step or a holding new since then, read from its series.
      const balances = { ...state.reconstruction?.balances }
      accountTokens.forEach((token) => {
        balances[token.holdingKey] ??= balanceNear(token, toTime)
      })

      const { assetTransfers } = await getAssetTransfersViaLogs(
        provider,
        { address, network },
        fromBlock + 1,
        toBlock,
      )
      const decimals = await this.decimalsByAsset()
      const reconstructed = accountTokens.flatMap((token) => {
        const contractAddress = contractAddressOf(token.assetID)
        const tokenDecimals =
          contractAddress === undefined
            ? undefined
            : decimals.get(contractAddress.toLowerCase())
        return contractAddress === undefined || tokenDecimals === undefined
          ? []
          : [{ token, contractAddress, decimals: tokenDecimals }]
      })
      const before = balancesBefore({
        account: address,
        tokens: reconstructed.map(({ token, contractAddress, ...rest }) => ({
          holdingKey: token.holdingKey,
          contractAddress,
          ...rest,
        })),
        balancesAtEnd: balances,
        transfers: assetTransfers,
      })
      Object.assign(balances, before)

      const time = await clock.timeOf(fromBlock, now)
      const points = reconstructed.map(({ token }) => ({
        ...infoOf(token),
        time,
        value: before[token.holdingKey],
        source: "reconstructed" as const,
      }))
      await this.db.addBalances(points)
      await this.db.putBackfillState({
        ...state,
        reconstruction: { block: fromBlock, balances },
        failures: 0,
        notBefore: undefined,
      })
    } catch (error) {
      if (error instanceof LogScanPausedError) return
      const reachedTime = state.reconstruction
        ? await clock.timeOf(state.reconstruction.block, now)
        : balanceFloor
      await this.recordFailure(
        state,
        error instanceof LogHistoryUnavailableError
          ? new UnavailableError(`Logs are pruned: ${error.message}`)
          : error,
        { start: reachedTime, size: 0 },
        now,
      )
    }
  }

  /**
   * Fills the newest bucket that any held asset's prices are missing. When
   * CoinGecko knows the asset and the bucket is within its reach, prices come
   * from CoinGecko a window at a time. Otherwise, base assets fall back to
   * their Chainlink feed, one bucket at a time. If neither source applies,
   * the bucket is recorded as the series' floor.
   */
  private async priceStep(
    holdings: Holding[],
    networks: EVMNetwork[],
    now: number,
    idle: boolean,
  ): Promise<void> {
    const byAsset = new Map<string, HoldingInfo>()
    holdings.forEach((holding) => byAsset.set(holding.assetID, infoOf(holding)))
    const priceSeries = await this.db.getPriceSeries([...byAsset.keys()])

    const candidates = (
      await Promise.all(
        [...byAsset.values()].map(async (holding) => {
          const key = `price:${holding.assetID}`
          const state = await this.db.getBackfillState(key)
          if (isResting(state, now)) return []
          const times = priceSeries.get(holding.assetID)?.times ?? []
          const buckets = missingBuckets(times, now, {
            floor: activeFloor(state, now),
          })
          this.#pending.set(key, buckets.length > 0)
          return buckets.length > 0 ? [{ holding, state, buckets }] : []
        }),
      )
    )
      .flat()
      .sort((a, b) => b.buckets[0].start - a.buckets[0].start)

    const next = candidates[0]
    if (!next) return
    const { holding, state, buckets } = next
    const [target] = buckets
    const network = networks.find(({ chainID }) => chainID === holding.chainID)
    if (!network) return

    const coinGecko = await this.coinGeckoTargetFor(holding)
    const feed = holding.assetID.endsWith("/base")
      ? BASE_ASSET_USD_FEEDS[holding.chainID]
      : undefined

    try {
      if (coinGecko && target.start >= now - COINGECKO_REACH) {
        if (!this.budgetFor("coingecko").take(1, now, idle)) return
        const to = target.start + target.size
        const from = Math.max(now - COINGECKO_REACH, to - COINGECKO_WINDOW)
        const points = latestPerBucket(
          await fetchPriceHistory(coinGecko, from, to),
          buckets,
        )
        if (!points.some(({ time }) => time >= target.start)) {
          // CoinGecko returned nothing for the newest gap, which means the
          // asset wasn't listed yet at that time.
          throw new UnavailableError(`CoinGecko has no ${holding.assetID} yet`)
        }
        await this.savePrices(holding, points)
      } else if (feed) {
        const feedClock = this.clockFor(feed.feedNetwork)
        const feedProvider = this.readyProvider(feed.feedNetwork)
        if (!feedClock || !feedProvider) return
        if (
          !this.budgetFor(`rpc:${feed.feedNetwork.chainID}`).take(
            READ_COST,
            now,
            idle,
          )
        ) {
          return
        }
        const feedDecimals = await this.feedDecimalsFor(
          feedProvider,
          feed.feedAddress,
        )
        const block = await feedClock.blockAt(target.start, now)
        const value = await fetchFeedPrice(
          HistoryService.historyReader(feedProvider),
          feed.feedAddress,
          feedDecimals,
          block,
        )
        await this.savePrices(holding, [{ time: target.start, value }])
      } else {
        throw new UnavailableError(`No price source reaches ${target.start}`)
      }
      await this.db.putBackfillState({
        ...state,
        failures: 0,
        notBefore: undefined,
      })
    } catch (error) {
      await this.recordFailure(state, error, target, now)
    }
  }

  private async savePrices(
    holding: HoldingInfo,
    points: HistoryPoint[],
  ): Promise<void> {
    await this.db.addPrices(
      points.map(({ time, value }) => ({
        priceKey: holding.assetID,
        symbol: holding.symbol,
        time,
        value,
        source: "backfill" as const,
      })),
    )
  }

  /**
   * Returns a Chainlink feed's decimals. These never change, so they are read
   * once and cached.
   */
  private async feedDecimalsFor(
    provider: NonNullable<ReturnType<ChainService["providerForNetwork"]>>,
    feedAddress: string,
  ): Promise<number> {
    let decimals = this.#feedDecimals.get(feedAddress)
    if (decimals === undefined) {
      const [read] = CHAINLINK_AGGREGATOR_INTERFACE.decodeFunctionResult(
        "decimals",
        await provider.call({
          to: feedAddress,
          data: CHAINLINK_AGGREGATOR_INTERFACE.encodeFunctionData("decimals"),
        }),
      )
      decimals = Number(read)
      this.#feedDecimals.set(feedAddress, decimals)
    }
    return decimals
  }

  /** Returns tracked tokens' decimals, keyed by lowercased contract address. */
  private async decimalsByAsset(): Promise<Map<string, number>> {
    const assets = await this.indexingService.getAssetsToTrack()
    return new Map(
      assets.map(({ contractAddress, decimals }) => [
        contractAddress.toLowerCase(),
        decimals,
      ]),
    )
  }

  /**
   * Returns the value over time of the queried accounts' holdings, sampled at
   * `samples` points across the queried span, along with when coverage starts
   * and whether backfill is still filling in the queried series.
   */
  async getValueHistory(query: ValueHistoryQuery): Promise<ValueHistory> {
    const { addresses, chainIDs, assetID, to, samples } = query
    const timings: Record<string, number> = {}
    let phaseStart = performance.now()
    const phase = (name: string) => {
      const now = performance.now()
      timings[name] = Math.round(now - phaseStart)
      phaseStart = now
    }

    // Each holding comes with its whole balance series, a record per
    // holding, so there's nothing more to read for balances.
    const [allHoldings, priceKeysBySymbol] = await Promise.all([
      this.db.getHoldings(addresses),
      this.db.getPriceKeysBySymbol(),
    ])
    const trusted = await this.trustResolver()
    const queried = allHoldings
      .map((holding) => ({ ...holding, trusted: trusted(holding) }))
      .filter(
        (holding) =>
          // Test networks only count when a chart asks for them by network or
          // asset, as the wallet's own totals leave them out.
          (chainIDs === undefined
            ? !TEST_NETWORK_BY_CHAIN_ID.has(holding.chainID)
            : chainIDs.includes(holding.chainID)) &&
          (assetID === undefined
            ? holding.trusted
            : holding.assetID === assetID),
      )
    const from =
      query.from === "start" ? (firstHeldTime(queried) ?? to - DAY) : query.from
    const holdings = queried.filter(
      // A holding that was already empty before the window adds nothing.
      (holding) => !(holding.value === 0 && holding.time <= from),
    )
    phase("holdings")

    const valued = holdings.map((holding) => ({
      holding,
      priceKey: HistoryService.priceKeyFor(holding, priceKeysBySymbol),
    }))
    const prices = await this.db.getPriceSeries([
      ...new Set(valued.map(({ priceKey }) => priceKey)),
    ])
    phase("prices")

    const {
      points,
      coverageStart,
      estimatedUntil,
      reconstructedUntil,
      unrecorded,
    } = valueSeries({
      holdings: valued.map(({ holding, priceKey }) => ({
        priceKey,
        balances: holding,
      })),
      prices,
      from,
      to,
      samples,
      priceTolerance: DAY,
    })
    phase("values")

    // A series that no backfill tick has checked yet counts as still
    // backfilling.
    const backfilling = holdings.some(
      (holding) =>
        (this.#pending.get(`balances:${holding.chainID}`) ?? true) ||
        (this.#pending.get(`price:${holding.assetID}`) ?? true),
    )

    const total = Object.values(timings).reduce((sum, ms) => sum + ms, 0)
    if (total >= SLOW_QUERY_MS) {
      const pointCount = (series: Series[]) =>
        series.reduce((sum, { times }) => sum + times.length, 0)
      logger.warn(
        `Value history took ${total}ms for ${holdings.length} holdings, ${prices.size} price series, ${pointCount(holdings)} balance and ${pointCount([...prices.values()])} price points.`,
        timings,
      )
    }

    const now = Date.now()
    const floors = await Promise.all(
      [...new Set(holdings.map(({ chainID }) => chainID))].map(
        async (chainID) =>
          activeFloor(
            await this.db.getBackfillState(`balances:${chainID}`),
            now,
          ),
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
}
