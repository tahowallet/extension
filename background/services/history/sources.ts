import { fetchJson } from "@ethersproject/web"
import { HistoricalStateUnavailableError } from "../chain/serial-fallback-provider"
import { utils } from "ethers"
import { MINUTE } from "../../constants"
import { AdaptiveSize } from "../../lib/adaptive-size"
import { ERC20_INTERFACE } from "../../lib/erc20"
import {
  CHAIN_SPECIFIC_MULTICALL_CONTRACT_ADDRESSES,
  MULTICALL_ABI,
  MULTICALL_CONTRACT_ADDRESS,
} from "../../lib/multicall"
import { CHAINLINK_AGGREGATOR_INTERFACE } from "../../lib/priceOracle"
import { HistoryPoint } from "./series"

const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3"

/**
 * Thrown when a source can serve a request, but not right now, for example
 * because of a rate limit or a server error.
 */
export class RetryLaterError extends Error {}

/**
 * Thrown when a source can't serve a request at all, for example because it
 * has no data that old.
 */
export class UnavailableError extends Error {}

/**
 * How CoinGecko identifies an asset: either by coin id, or by a token
 * contract address on a platform.
 */
export type CoinGeckoTarget =
  | { coinID: string }
  | { platformID: string; contractAddress: string }

/**
 * Fetches prices of an asset in USD between two times from CoinGecko's
 * public market chart API. Windows of 90 days or less come back hourly, while
 * longer ones come back daily. Note that the public API only reaches back a
 * year.
 *
 * Throws {@link RetryLaterError} on rate limits and server errors, and
 * {@link UnavailableError} if CoinGecko refuses the request outright.
 */
export async function fetchPriceHistory(
  target: CoinGeckoTarget,
  from: number,
  to: number,
): Promise<HistoryPoint[]> {
  const path =
    "coinID" in target
      ? `coins/${target.coinID}`
      : `coins/${target.platformID}/contract/${target.contractAddress.toLowerCase()}`
  const url = `${COINGECKO_API_ROOT}/${path}/market_chart/range?vs_currency=usd&from=${Math.floor(
    from / 1000,
  )}&to=${Math.ceil(to / 1000)}`

  let json: unknown
  try {
    json = await fetchJson({ url, throttleCallback: async () => false })
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 429 || status === undefined || status >= 500) {
      throw new RetryLaterError(`CoinGecko unavailable (${status})`)
    }
    // CoinGecko answers 401 for endpoints that require an API key, and 404
    // for unknown assets.
    throw new UnavailableError(`CoinGecko refused ${path} (${status})`)
  }

  const prices = (json as { prices?: unknown }).prices
  if (!Array.isArray(prices)) return []
  return prices.flatMap((entry) =>
    Array.isArray(entry) &&
    typeof entry[0] === "number" &&
    typeof entry[1] === "number"
      ? [{ time: entry[0], value: entry[1] }]
      : [],
  )
}

const ARCHIVE_UNAVAILABLE =
  /missing trie node|header not found|state.*(not available|pruned|unavailable)|historical state|archive|block.*not found|pruned/i

/** The subset of a provider's interface that history reads need. */
export type HistoryReader = {
  getBlock(
    blockTag: number | "latest",
  ): Promise<{ number: number; timestamp: number }>
  call(
    transaction: { to: string; data: string },
    blockTag: number,
  ): Promise<string>
}

/**
 * How long a chain's block pace, as measured from its latest blocks, is
 * trusted before it's measured again.
 */
const CLOCK_TTL = 10 * MINUTE

/**
 * A BlockClock finds the block mined at a given time on one chain. The
 * chain's pace is measured every {@link CLOCK_TTL} from its recent blocks, so
 * that each lookup costs a single block request: the block number is
 * estimated from the pace, then refined once against the block found.
 */
export class BlockClock {
  #pace:
    | { latest: { number: number; timestamp: number }; msPerBlock: number }
    | undefined

  #measuredAt = 0

  constructor(private readonly provider: HistoryReader) {}

  private async pace(now: number) {
    if (this.#pace === undefined || now - this.#measuredAt > CLOCK_TTL) {
      const latest = await this.provider.getBlock("latest")
      const distance = Math.min(latest.number, 10_000)
      const sample = await this.provider.getBlock(latest.number - distance)
      this.#pace = {
        latest,
        msPerBlock:
          ((latest.timestamp - sample.timestamp) * 1000) /
          Math.max(distance, 1),
      }
      this.#measuredAt = now
    }
    return this.#pace
  }

  /**
   * Returns the number of a block mined at or shortly before `time`, as
   * estimated from the chain's pace.
   */
  async blockAt(time: number, now = Date.now()): Promise<number> {
    const { latest, msPerBlock } = await this.pace(now)
    const estimate = (from: { number: number; timestamp: number }) =>
      Math.max(
        0,
        Math.min(
          latest.number,
          from.number -
            Math.ceil((from.timestamp * 1000 - time) / Math.max(msPerBlock, 1)),
        ),
      )
    const first = await this.provider.getBlock(estimate(latest))
    return estimate(first)
  }
}

/**
 * Classifies a failed historical read. Returns an {@link UnavailableError} if
 * the endpoint doesn't keep state that old; otherwise, returns the original
 * error, wrapped in a {@link RetryLaterError} if it isn't an `Error`.
 */
function historicalReadError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (
    error instanceof HistoricalStateUnavailableError ||
    ARCHIVE_UNAVAILABLE.test(message)
  ) {
    return new UnavailableError(`No historical state: ${message}`)
  }
  return error instanceof Error ? error : new RetryLaterError(message)
}

const MULTICALL_INTERFACE = new utils.Interface(MULTICALL_ABI)

/**
 * A single balance read in a snapshot: an account's base asset balance, or
 * its balance of the token at `contractAddress`.
 */
export type BalanceRead = { address: string; contractAddress?: string }

/** One read's outcome in an `aggregate3` response. */
type AggregateResult = { success: boolean; returnData: string }

/** The fewest reads a failing multicall is split down to. */
const MINIMUM_MULTICALL_SIZE = 8

/**
 * Reads many balances at one block in as few requests as possible, using
 * Multicall3's `aggregate3`. Each read is allowed to fail on its own, so a
 * token that didn't exist yet reads as nothing rather than failing the rest.
 * Calls are sized by `size`, which cuts them down when an endpoint's gas cap
 * or response limit refuses them, and remembers what it learns.
 *
 * Resolves to each read's raw amount, or `undefined` where that read failed.
 * Throws {@link UnavailableError} if the block predates Multicall3 or the
 * endpoint keeps no state that old.
 */
export async function snapshotBalances(
  provider: HistoryReader,
  chainID: string,
  reads: BalanceRead[],
  blockTag: number,
  size: AdaptiveSize,
): Promise<(bigint | undefined)[]> {
  const multicallAddress =
    CHAIN_SPECIFIC_MULTICALL_CONTRACT_ADDRESSES[chainID] ??
    MULTICALL_CONTRACT_ADDRESS

  const run = async (batch: BalanceRead[]): Promise<(bigint | undefined)[]> => {
    if (size.max !== undefined && !size.fits(batch.length)) {
      return inPieces(batch, size.max)
    }

    let result: string
    try {
      result = await provider.call(
        {
          to: multicallAddress,
          data: MULTICALL_INTERFACE.encodeFunctionData("aggregate3", [
            batch.map(({ address, contractAddress }) =>
              contractAddress === undefined
                ? {
                    target: multicallAddress,
                    allowFailure: true,
                    callData: MULTICALL_INTERFACE.encodeFunctionData(
                      "getEthBalance",
                      [address],
                    ),
                  }
                : {
                    target: contractAddress,
                    allowFailure: true,
                    callData: ERC20_INTERFACE.encodeFunctionData("balanceOf", [
                      address,
                    ]),
                  },
            ),
          ]),
        },
        blockTag,
      )
    } catch (error) {
      const failure = historicalReadError(error)
      if (failure instanceof UnavailableError) throw failure
      const retrySize = size.retrySizeAfter(error, batch.length)
      if (retrySize === undefined) throw failure
      return inPieces(batch, retrySize)
    }

    // A call to an address with no code returns nothing, which means
    // Multicall3 wasn't deployed yet at this block.
    if (result === "0x") {
      throw new UnavailableError(`No Multicall3 at block ${blockTag}`)
    }

    const decoded: unknown = MULTICALL_INTERFACE.decodeFunctionResult(
      "aggregate3",
      result,
    )[0]
    if (!Array.isArray(decoded)) {
      throw new Error("Unexpected aggregate3 response")
    }
    return decoded.map(({ success, returnData: data }: AggregateResult) => {
      // A call to a token with no code yet succeeds, but returns no data.
      if (!success || data === "0x") return undefined
      try {
        return BigInt(data)
      } catch {
        return undefined
      }
    })
  }

  const inPieces = async (
    batch: BalanceRead[],
    pieceSize: number,
  ): Promise<(bigint | undefined)[]> => {
    const results: (bigint | undefined)[] = []
    for (let start = 0; start < batch.length; start += pieceSize) {
      // Pieces are sent one at a time, so that an endpoint that is already
      // refusing requests isn't sent more of them at once.
      // oxlint-disable-next-line no-await-in-loop
      results.push(...(await run(batch.slice(start, start + pieceSize))))
    }
    return results
  }

  return reads.length === 0 ? [] : run(reads)
}

/**
 * Creates the adaptive multicall size for a chain's history snapshots,
 * labeled with the chain id for logs.
 */
export function multicallSizeFor(chainID: string): AdaptiveSize {
  return new AdaptiveSize(
    `chain ${chainID}: history multicall`,
    "reads",
    MINIMUM_MULTICALL_SIZE,
  )
}

/**
 * Reads a Chainlink feed's answer at a block, in USD, given the feed's
 * decimals. Throws {@link UnavailableError} if the feed didn't exist yet, if
 * the endpoint keeps no state that old, or if the answer isn't positive.
 */
export async function fetchFeedPrice(
  provider: HistoryReader,
  feedAddress: string,
  feedDecimals: number,
  blockTag: number,
): Promise<number> {
  let result: string
  try {
    result = await provider.call(
      {
        to: feedAddress,
        data: CHAINLINK_AGGREGATOR_INTERFACE.encodeFunctionData(
          "latestRoundData",
        ),
      },
      blockTag,
    )
  } catch (error) {
    throw historicalReadError(error)
  }
  if (result === "0x") {
    throw new UnavailableError(`No feed at block ${blockTag}`)
  }
  const { answer } = CHAINLINK_AGGREGATOR_INTERFACE.decodeFunctionResult(
    "latestRoundData",
    result,
  )
  const price = Number(answer.toString()) / 10 ** feedDecimals
  if (!(price > 0)) {
    throw new UnavailableError(`Feed answered ${String(answer)}`)
  }
  return price
}
