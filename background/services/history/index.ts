import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import ChainService from "../chain"
import IndexingService from "../indexing"
import logger from "../../lib/logger"
import { DAY, HOUR, MINUTE } from "../../constants"
import { FIAT_CURRENCIES_SYMBOL } from "../../constants/currencies"
import type { AccountBalance } from "../../accounts"
import type { PricePoint } from "../../assets"
import { isFungibleAsset, isSmartContractFungibleAsset } from "../../assets"
import {
  getFullAssetID,
  isNetworkBaseAsset,
  isTrustedAsset,
} from "../../redux-slices/utils/asset-utils"
import { normalizeEVMAddress } from "../../lib/utils"
import { findGaps } from "./compaction"
import {
  BackfillState,
  BalanceRecord,
  HistoryDatabase,
  getOrCreateDB,
  holdingKeyFor,
} from "./db"
import { HistoryPoint, valueSeries } from "./series"
import {
  CoinGeckoTarget,
  RetryLaterError,
  UnavailableError,
  blockAtTime,
  fetchHistoricalBalance,
  fetchPriceHistory,
} from "./sources"

/** How far back prices are backfilled; CoinGecko's public API stops here. */
const PRICE_HORIZON = 365 * DAY
/** How far back balances are backfilled, a point a day. */
const BALANCE_HORIZON = 90 * DAY
/**
 * The span each CoinGecko price request covers. CoinGecko serves spans of
 * this size or less at hourly resolution.
 */
const PRICE_CHUNK = 90 * DAY
/** Infill leaves the latest stretch to live updates. */
const INFILL_SETTLE = 2 * HOUR

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
  from: number
  to: number
  samples: number
}

export type ValueHistory = {
  points: HistoryPoint[]
  coverageStart: number | undefined
  /** Whether backfill still has work to do for any of the queried series. */
  backfilling: boolean
}

type BackfillCandidate = {
  key: string
  kind: "price" | "balance"
  horizon: number
  /** Does one unit of work, given where the series stands. */
  run: (state: BackfillState, now: number) => Promise<BackfillState>
}

const startOfDay = (time: number) => Math.floor(time / DAY) * DAY

/**
 * Keeps chartable history of prices and balances. It records what the
 * wallet already fetches, thins it as it ages, and slowly backfills and
 * infills what it missed: one request per tick, so it never competes with
 * the wallet's own traffic.
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
        schedule: { delayInMinutes: 2, periodInMinutes: 2 },
        handler: () => {
          void this.backfillOnce()
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

  private async recordPrices(pricePoints: PricePoint[]): Promise<void> {
    const records = pricePoints.flatMap((pricePoint) => {
      const fiatIndex = pricePoint.pair.findIndex(({ symbol }) =>
        FIAT_CURRENCIES_SYMBOL.includes(symbol),
      )
      if (fiatIndex === -1) return []
      const fiat = pricePoint.pair[fiatIndex]
      const asset = pricePoint.pair[1 - fiatIndex]
      if (
        !(isNetworkBaseAsset(asset) || isSmartContractFungibleAsset(asset)) ||
        !isFungibleAsset(fiat)
      ) {
        return []
      }
      const assetUnits =
        Number(pricePoint.amounts[1 - fiatIndex]) / 10 ** asset.decimals
      const fiatUnits =
        Number(pricePoint.amounts[fiatIndex]) / 10 ** fiat.decimals
      if (!(assetUnits > 0) || !Number.isFinite(fiatUnits)) return []

      return [
        {
          priceKey: getFullAssetID(asset),
          symbol: asset.symbol,
          // Price points carry UNIX seconds.
          time: pricePoint.time * 1000,
          value: fiatUnits / assetUnits,
          source: "live" as const,
        },
      ]
    })
    if (records.length > 0) await this.db.addPrices(records)
  }

  private async recordBalances(balances: AccountBalance[]): Promise<void> {
    await Promise.all(
      balances.map(({ address, network, assetAmount, retrievedAt }) => {
        const { asset, amount } = assetAmount
        const assetID = getFullAssetID(asset)
        return this.db.addBalance({
          holdingKey: holdingKeyFor(address, assetID),
          address: normalizeEVMAddress(address),
          chainID: network.chainID,
          assetID,
          symbol: asset.symbol,
          trusted: isTrustedAsset(asset),
          time: retrievedAt,
          value: Number(amount) / 10 ** asset.decimals,
          source: "live",
        })
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
   * Returns the price key whose history should be used to value an asset.
   * Prices recorded for the asset's own id are preferred, then prices for any
   * asset with the same symbol. If neither exists, the asset's id is used.
   */
  private async priceKeyFor(assetID: string, symbol: string): Promise<string> {
    if ((await this.db.getEarliestPriceTime(assetID)) !== undefined) {
      return assetID
    }
    const [bySymbol] = await this.db.getPriceKeysForSymbol(symbol)
    return bySymbol ?? assetID
  }

  /**
   * Returns how CoinGecko identifies a held asset, or `undefined` if the
   * asset's network isn't tracked or CoinGecko has no id for the asset.
   */
  private async coinGeckoTargetFor(
    holding: BalanceRecord,
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

  private async backfillCandidates(): Promise<BackfillCandidate[]> {
    const accounts = await this.chainService.getAccountsToTrack()
    const holdings = await this.db.getHoldings(
      accounts.map(({ address }) => address),
    )
    const networks = await this.chainService.getTrackedNetworks()
    const candidates: BackfillCandidate[] = []
    const pricedKeys = new Set<string>()

    await Promise.all(
      holdings
        .filter(({ trusted }) => trusted)
        .map(async (holding) => {
          // Prices: one candidate per asset, by the key it's valued with.
          const target = await this.coinGeckoTargetFor(holding)
          if (target && !pricedKeys.has(holding.assetID)) {
            pricedKeys.add(holding.assetID)
            candidates.push(
              this.priceCandidate(holding.assetID, holding.symbol, target),
            )
          }

          const network = networks.find(
            ({ chainID }) => chainID === holding.chainID,
          )
          if (network) {
            candidates.push(this.balanceCandidate(holding, network.chainID))
          }
        }),
    )

    return candidates
  }

  private priceCandidate(
    priceKey: string,
    symbol: string,
    target: CoinGeckoTarget,
  ): BackfillCandidate {
    const save = async (points: HistoryPoint[]) =>
      this.db.addPrices(
        points.map(({ time, value }) => ({
          priceKey,
          symbol,
          time,
          value,
          source: "backfill" as const,
        })),
      )

    return {
      key: `price:${priceKey}`,
      kind: "price",
      horizon: PRICE_HORIZON,
      run: async (state, now) => {
        const reachedBack =
          state.reachedBack ??
          (await this.db.getEarliestPriceTime(priceKey)) ??
          now
        const limit = now - PRICE_HORIZON

        if (reachedBack > limit) {
          // Backfill: the next chunk further back.
          const from = Math.max(limit, reachedBack - PRICE_CHUNK)
          await save(await fetchPriceHistory(target, from, reachedBack))
          return { ...state, reachedBack: from }
        }

        // Infill: the newest gap since the horizon.
        const to = now - INFILL_SETTLE
        const [gap] = findGaps(
          await this.db.getPriceTimes(priceKey, limit, to),
          limit,
          to,
          now,
        )
        if (gap) {
          const from = Math.max(gap.from, gap.to - PRICE_CHUNK)
          const points = await fetchPriceHistory(target, from, gap.to)
          // Keep only points inside the gap; its edges are already known.
          await save(points.filter(({ time }) => time > from && time < gap.to))
        }
        return state
      },
    }
  }

  private balanceCandidate(
    holding: BalanceRecord,
    chainID: string,
  ): BackfillCandidate {
    const contractAddress = holding.assetID.endsWith("/base")
      ? undefined
      : holding.assetID.split("/")[1]

    const sample = async (time: number) => {
      const network = (await this.chainService.getTrackedNetworks()).find(
        (candidate) => candidate.chainID === chainID,
      )
      const provider = network && this.chainService.providerForNetwork(network)
      if (!network || !provider) throw new RetryLaterError("No provider yet")
      const block = await blockAtTime(provider, time)
      const amount = await fetchHistoricalBalance(
        provider,
        holding.address,
        contractAddress,
        block,
      )
      const decimals =
        contractAddress === undefined
          ? network.baseAsset.decimals
          : await this.decimalsFor(holding)
      await this.db.addBalances([
        {
          ...holding,
          id: undefined,
          time,
          value: Number(amount) / 10 ** decimals,
          source: "backfill",
        },
      ])
    }

    return {
      key: `balance:${holding.holdingKey}`,
      kind: "balance",
      horizon: BALANCE_HORIZON,
      run: async (state, now) => {
        const reachedBack =
          state.reachedBack ??
          (await this.db.getEarliestBalanceTime(holding.holdingKey)) ??
          now
        const limit = now - BALANCE_HORIZON

        if (reachedBack > limit) {
          // Backfill: the start of the day before the earliest point.
          const time = startOfDay(reachedBack - 1)
          await sample(time)
          return { ...state, reachedBack: time }
        }

        const to = now - INFILL_SETTLE
        const [gap] = findGaps(
          await this.db.getBalanceTimes(holding.holdingKey, limit, to),
          limit,
          to,
          now,
        )
        if (gap) await sample(Math.round((gap.from + gap.to) / 2))
        return state
      },
    }
  }

  /** A held token's decimals, from the balance records' source asset. */
  private async decimalsFor(holding: BalanceRecord): Promise<number> {
    const [, contractAddress] = holding.assetID.split("/")
    const asset = (await this.indexingService.getAssetsToTrack()).find(
      ({ contractAddress: candidate }) =>
        candidate.toLowerCase() === contractAddress?.toLowerCase(),
    )
    if (!asset) throw new UnavailableError("Unknown token decimals")
    return asset.decimals
  }

  /**
   * Does one unit of backfill or infill work: the series that waited
   * longest, prices before balances since they're cheaper and value every
   * account at once.
   */
  async backfillOnce(now = Date.now()): Promise<void> {
    const candidates = await this.backfillCandidates()
    const states = await Promise.all(
      candidates.map((candidate) => this.db.getBackfillState(candidate.key)),
    )

    const ready = candidates
      .map((candidate, index) => ({ candidate, state: states[index] }))
      .filter(
        ({ state }) => !state.unavailable && (state.notBefore ?? 0) <= now,
      )
      .sort(
        (a, b) =>
          (a.candidate.kind === "price" ? 0 : 1) -
            (b.candidate.kind === "price" ? 0 : 1) ||
          (a.state.notBefore ?? 0) - (b.state.notBefore ?? 0),
      )

    const next = ready[0]
    if (!next) return

    const { candidate, state } = next
    try {
      const updated = await candidate.run(state, now)
      // Revisit a finished series only occasionally, for new gaps.
      const settled = (updated.reachedBack ?? now) <= now - candidate.horizon
      await this.db.putBackfillState({
        ...updated,
        failures: 0,
        notBefore: now + (settled ? 6 * HOUR : MINUTE),
      })
    } catch (error) {
      const failures = (state.failures ?? 0) + 1
      await this.db.putBackfillState({
        ...state,
        failures,
        unavailable: error instanceof UnavailableError || undefined,
        // Back off exponentially, up to a day.
        notBefore: now + Math.min(DAY, 2 ** failures * MINUTE),
      })
      logger.debug("History backfill step failed", candidate.key, error)
    }
  }

  /**
   * Returns the value over time of the queried accounts' holdings, sampled at
   * `samples` points across the queried span, along with when coverage starts
   * and whether backfill is still filling in the queried series.
   */
  async getValueHistory(query: ValueHistoryQuery): Promise<ValueHistory> {
    const { addresses, chainIDs, assetID, from, to, samples } = query
    const holdings = (await this.db.getHoldings(addresses)).filter(
      (holding) =>
        (chainIDs === undefined || chainIDs.includes(holding.chainID)) &&
        (assetID === undefined ? holding.trusted : holding.assetID === assetID),
    )

    const series = await Promise.all(
      holdings.map(async (holding) => {
        const [balances, priceKey] = await Promise.all([
          this.db.getBalanceSeries(holding.holdingKey, from, to),
          this.priceKeyFor(holding.assetID, holding.symbol),
        ])
        return { holding, balances, priceKey }
      }),
    )

    const prices = new Map<string, HistoryPoint[]>()
    await Promise.all(
      [...new Set(series.map(({ priceKey }) => priceKey))].map(
        async (priceKey) => {
          prices.set(priceKey, await this.db.getPriceSeries(priceKey, from, to))
        },
      ),
    )

    const { points, coverageStart } = valueSeries({
      holdings: series.map(({ priceKey, balances }) => ({
        priceKey,
        balances: balances.points,
      })),
      prices,
      from,
      to,
      samples,
      priceTolerance: DAY,
    })

    const now = Date.now()
    const states = await Promise.all(
      series.flatMap(({ holding, priceKey }) => [
        this.db.getBackfillState(`balance:${holding.holdingKey}`),
        this.db.getBackfillState(`price:${priceKey}`),
      ]),
    )
    const backfilling = states.some(
      (state) =>
        !state.unavailable &&
        (state.reachedBack === undefined ||
          state.reachedBack >
            now -
              (state.key.startsWith("price:")
                ? PRICE_HORIZON
                : BALANCE_HORIZON)),
    )

    return { points, coverageStart, backfilling }
  }
}
