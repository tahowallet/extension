import browser from "webextension-polyfill"
import type ChainService from "../../chain"
import type { IndexingDatabase } from "../db"
import logger from "../../../lib/logger"
import { AdaptiveSize } from "../../../lib/adaptive-size"
import {
  BASE_ASSET_USD_FEEDS,
  CHAINLINK_AGGREGATOR_INTERFACE,
} from "../../../lib/priceOracle"
import { DAY, MINUTE, TEST_NETWORK_BY_CHAIN_ID } from "../../../constants"
import type { SmartContractFungibleAsset } from "../../../assets"
import type { EVMNetwork } from "../../../networks"
import { getAssetTransfersViaLogs } from "../../../lib/erc20-transfer-logs"
import {
  LogHistoryUnavailableError,
  LogScanPausedError,
} from "../../chain/rpc/log-query-errors"
import {
  BackfillState,
  BalanceSeries,
  BalanceSeriesInfo,
  balanceSeriesInfoOf,
} from "./records"
import { HistoryPoint } from "./series"
import { BACKFILL_HORIZON, Bucket, missingBuckets } from "./schedule"
import { balancesBefore } from "./reconstruction"
import { RateBudget } from "./budget"
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
} from "./sources"

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

/** Backfill ticks that take at least this long log a warning. */
const SLOW_TICK_MS = 5_000

/**
 * How many blocks one step of reconstructing token balances from transfers
 * covers. Common endpoint caps on log query ranges are 10,000 blocks or
 * more, and the log scan adapts to smaller ones.
 */
const RECONSTRUCTION_STEP_BLOCKS = 10_000

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
 * Returns a series' balance at `time`: its latest point at or before it, or
 * failing that its earliest point.
 */
const balanceNear = (
  { times, values }: BalanceSeries,
  time: number,
): number => {
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

/**
 * Returns the contract address from a full asset id, or `undefined` if the
 * asset is a base asset.
 */
const contractAddressOf = (assetID: string): string | undefined =>
  assetID.endsWith("/base") ? undefined : assetID.split("/")[1]

/**
 * Returns a backfill state's floor, or `undefined` if it has none or the
 * floor is older than {@link FLOOR_RECHECK} and should be looked past again.
 */
export const activeFloor = (
  state: BackfillState,
  now: number,
): number | undefined =>
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

type Provider = NonNullable<ReturnType<ChainService["providerForNetwork"]>>

/**
 * Returns a reader for a chain's past state. Calls at old blocks go through
 * {@link SerialFallbackProvider.historicalCall}, which asks each of the
 * chain's endpoints in turn, since often only some of them keep old state.
 */
const historyReader = (provider: Provider): HistoryReader => ({
  getBlock: (blockTag) => provider.getBlock(blockTag),
  call: (transaction, blockTag) =>
    provider.historicalCall(transaction, blockTag),
})

/** What backfill reads from and writes to. */
export type HistoryBackfillSources = {
  db: IndexingDatabase
  chainService: ChainService
  /**
   * Returns a function that says whether a balance series' asset is trusted
   * right now; only trusted assets are backfilled.
   */
  trustResolver: () => Promise<(series: BalanceSeriesInfo) => boolean>
  getAssetsToTrack: () => Promise<SmartContractFungibleAsset[]>
}

/**
 * Slowly backfills and infills the price and balance history that the wallet
 * didn't record live, newest first, out to two years.
 *
 * Each chain and CoinGecko get a small budget of requests per minute, which
 * is larger while the user is away. As a result, backfill trickles along
 * beside the wallet's own traffic during the day and catches up overnight.
 */
export class HistoryBackfill {
  #clocks = new Map<string, BlockClock>()

  #multicallSizes = new Map<string, AdaptiveSize>()

  #budgets = new Map<string, RateBudget>()

  #feedDecimals = new Map<string, number>()

  #ticking = false

  /**
   * Whether each source of history still has backfill work, as of the last
   * tick that checked it, keyed by backfill state key. Charts read this
   * rather than working it out from two years of a series' history.
   */
  #pending = new Map<string, boolean>()

  constructor(private sources: HistoryBackfillSources) {}

  /**
   * Checks whether the given backfill state key still has work to do, as of
   * the last tick that checked it. A key that no tick has checked yet counts
   * as still backfilling.
   */
  isPending(key: string): boolean {
    return this.#pending.get(key) ?? true
  }

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
  private readyProvider(network: EVMNetwork): Provider | undefined {
    const provider = this.sources.chainService.providerForNetwork(network)
    if (
      !provider ||
      provider.reachability === "unreachable" ||
      !provider.canServeNow("eth_call")
    ) {
      return undefined
    }
    return provider
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
   * Returns how CoinGecko identifies an asset, or `undefined` if the asset's
   * network isn't tracked or CoinGecko has no id for the asset.
   */
  private async coinGeckoTargetFor(
    info: BalanceSeriesInfo,
  ): Promise<CoinGeckoTarget | undefined> {
    const network = (await this.sources.chainService.getTrackedNetworks()).find(
      ({ chainID }) => chainID === info.chainID,
    )
    if (!network) return undefined
    if (info.assetID.endsWith("/base")) {
      const coinID = network.baseAsset.metadata?.coinGeckoID
      return coinID ? { coinID } : undefined
    }
    const [, contractAddress] = info.assetID.split("/")
    return network.coingeckoPlatformID && contractAddress
      ? { platformID: network.coingeckoPlatformID, contractAddress }
      : undefined
  }

  /**
   * Records a failed backfill step for the given state. If the source has
   * nothing as old as `bucket`, signaled by an {@link UnavailableError}, the
   * end of the bucket is recorded as the state's floor. Any other failure
   * backs the source off exponentially.
   */
  private async recordFailure(
    state: BackfillState,
    error: unknown,
    bucket: Bucket,
    now: number,
  ): Promise<void> {
    if (error instanceof UnavailableError) {
      // Logged at info, since this stops backfill for the source until the
      // floor is rechecked, and the reason matters for any chart that shows it.
      logger.info(
        `History backfill for ${state.key} reaches no further back than ${new Date(bucket.start + bucket.size).toISOString()}: ${error.message}`,
      )
      await this.sources.db.putBackfillState({
        ...state,
        floor: bucket.start + bucket.size,
        floorAt: now,
        failures: 0,
      })
      return
    }
    const failures = (state.failures ?? 0) + 1
    await this.sources.db.putBackfillState({
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
  async tick(now = Date.now()): Promise<void> {
    if (this.#ticking) return
    this.#ticking = true
    const startedAt = performance.now()
    try {
      const { chainService, db } = this.sources
      const idle = await isUserIdle()
      const accounts = await chainService.getAccountsToTrack()
      const trusted = await this.sources.trustResolver()
      // Test networks are left out, as they are of the wallet's totals. Their
      // history isn't worth the requests it would take to backfill.
      const holdings = (
        await db.getBalanceSeries(accounts.map(({ address }) => address))
      )
        .map((series) => ({ ...series, trusted: trusted(series) }))
        .filter(
          (series) =>
            series.trusted && !TEST_NETWORK_BY_CHAIN_ID.has(series.chainID),
        )
      const networks = await chainService.getTrackedNetworks()

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
   * Fills the newest bucket that any of a network's balance series is
   * missing, with a snapshot of every series missing that bucket. A snapshot
   * costs one block lookup and, size limits permitting, one multicall,
   * however many accounts and tokens there are.
   */
  private async balanceStep(
    network: EVMNetwork,
    holdings: BalanceSeries[],
    now: number,
    idle: boolean,
  ): Promise<void> {
    if (holdings.length === 0) return
    const { db } = this.sources
    const state = await db.getBackfillState(`balances:${network.chainID}`)
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
        historyReader(provider),
        network.chainID,
        reads,
        block,
        size,
      )
      await db.addBalanceMeasurements(
        needing.map(({ holding, holdingDecimals }, index) => ({
          ...balanceSeriesInfoOf(holding),
          retrievedAt: target.start,
          // A failed read means the token didn't exist yet or can't report
          // a balance; either way, nothing was held.
          value: Number(amounts[index] ?? 0n) / 10 ** holdingDecimals,
          origin: "backfill" as const,
        })),
      )
      await db.putBackfillState({
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
   * of its token balance series.
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
    holdings: BalanceSeries[],
    now: number,
    idle: boolean,
  ): Promise<void> {
    const { db } = this.sources
    const balanceState = await db.getBackfillState(
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
          state: await db.getBackfillState(
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
      // the first step or a series new since then, read from its points.
      const balances = { ...state.reconstruction?.balances }
      accountTokens.forEach((token) => {
        balances[token.key] ??= balanceNear(token, toTime)
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
          key: token.key,
          contractAddress,
          ...rest,
        })),
        balancesAtEnd: balances,
        transfers: assetTransfers,
      })
      Object.assign(balances, before)

      const time = await clock.timeOf(fromBlock, now)
      await db.addBalanceMeasurements(
        reconstructed.map(({ token }) => ({
          ...balanceSeriesInfoOf(token),
          retrievedAt: time,
          value: before[token.key],
          origin: "reconstructed" as const,
        })),
      )
      await db.putBackfillState({
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
   * the bucket is recorded as the state's floor.
   */
  private async priceStep(
    holdings: BalanceSeries[],
    networks: EVMNetwork[],
    now: number,
    idle: boolean,
  ): Promise<void> {
    const { db } = this.sources
    const byAsset = new Map<string, BalanceSeriesInfo>()
    holdings.forEach((holding) =>
      byAsset.set(holding.assetID, balanceSeriesInfoOf(holding)),
    )
    const priceSeries = await db.getPriceSeries(
      [...byAsset.values()].map(({ assetID }) => assetID),
    )

    const candidates = (
      await Promise.all(
        [...byAsset.values()].map(async (holding) => {
          const key = `price:${holding.assetID}`
          const state = await db.getBackfillState(key)
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
          historyReader(feedProvider),
          feed.feedAddress,
          feedDecimals,
          block,
        )
        await this.savePrices(holding, [{ time: target.start, value }])
      } else {
        throw new UnavailableError(`No price source reaches ${target.start}`)
      }
      await db.putBackfillState({
        ...state,
        failures: 0,
        notBefore: undefined,
      })
    } catch (error) {
      await this.recordFailure(state, error, target, now)
    }
  }

  private async savePrices(
    { assetID, symbol }: BalanceSeriesInfo,
    points: HistoryPoint[],
  ): Promise<void> {
    await this.sources.db.savePriceMeasurements(
      points.map(({ time, value }) => ({
        assetID,
        symbol,
        time,
        value,
        origin: "backfill" as const,
      })),
    )
  }

  /**
   * Returns a Chainlink feed's decimals. These never change, so they are read
   * once and cached.
   */
  private async feedDecimalsFor(
    provider: Provider,
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
    const assets = await this.sources.getAssetsToTrack()
    return new Map(
      assets.map(({ contractAddress, decimals }) => [
        contractAddress.toLowerCase(),
        decimals,
      ]),
    )
  }
}
