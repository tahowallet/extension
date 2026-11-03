import { fetchJson } from "@ethersproject/web"
import type { BaseProvider } from "@ethersproject/providers"
import { ERC20_INTERFACE } from "../../lib/erc20"
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

/**
 * The number of a block mined at or shortly before `time`, estimated from
 * the chain's recent block time and refined once against the block found.
 */
export async function blockAtTime(
  provider: BaseProvider,
  time: number,
): Promise<number> {
  const latest = await provider.getBlock("latest")
  const sampleDistance = Math.min(latest.number, 10_000)
  const sample = await provider.getBlock(latest.number - sampleDistance)
  const msPerBlock =
    ((latest.timestamp - sample.timestamp) * 1000) / Math.max(sampleDistance, 1)

  const estimate = (from: { number: number; timestamp: number }) =>
    Math.max(
      0,
      Math.min(
        latest.number,
        from.number - Math.ceil((from.timestamp * 1000 - time) / msPerBlock),
      ),
    )

  const first = await provider.getBlock(estimate(latest))
  return estimate(first)
}

/**
 * An account's balance of a network's base asset or a token at a block,
 * which needs an endpoint that keeps historical state.
 */
export async function fetchHistoricalBalance(
  provider: BaseProvider,
  address: string,
  contractAddress: string | undefined,
  blockTag: number,
): Promise<bigint> {
  try {
    if (contractAddress === undefined) {
      return (await provider.getBalance(address, blockTag)).toBigInt()
    }
    const result = await provider.call(
      {
        to: contractAddress,
        data: ERC20_INTERFACE.encodeFunctionData("balanceOf", [address]),
      },
      blockTag,
    )
    return BigInt(result)
  } catch (error) {
    const message = String((error as Error)?.message ?? error)
    if (ARCHIVE_UNAVAILABLE.test(message)) {
      throw new UnavailableError(`No historical state: ${message}`)
    }
    throw new RetryLaterError(message)
  }
}
