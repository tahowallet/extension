import { fetchJson } from "@ethersproject/web"
import { utils } from "ethers"
import { SwappableAsset } from "../assets"
import {
  COMMUNITY_MULTISIG_ADDRESS_BY_CHAINID,
  DEFAULT_COMMUNITY_MULTISIG_ADDRESS,
} from "../constants"
import { EVMNetwork } from "../networks"
import { SwapQuoteRequest } from "../redux-slices/utils/0x-swap-utils"
import { isNetworkBaseAsset } from "../redux-slices/utils/asset-utils"
import type { HexString } from "../types"
import {
  GetPriceParams,
  GetQuoteParams,
  LiquidSwapPrice,
  LiquidSwapQuote,
  SwapRouteFill,
} from "./0x-swap-types"
import logger from "./logger"
import { retryWithBackoff } from "./retry"
import { isTransientFetchJsonError } from "../utils/fetching"
import {
  isValid0xSwapPriceResponse,
  isValid0xSwapQuoteResponse,
} from "./validate"

export const SWAP_FEE = 0.01

/**
 * Chain ids where 0xSwap is supported
 *
 * Networks added to this struct will have an in-wallet Swap page
 */
export const NETWORKS_SUPPORTING_SWAPS = new Set([
  "1", // Ethereum
  "42161", // Arbitrum
  "43114", // Avalanche
  "8453", // Base
  "80094", // Berachain
  "81457", // Blast
  "56", // BSC
  "57073", // Ink
  "59144", // Linea
  "5000", // Mantle
  "34443", // Mode
  "143", // Monad
  "10", // Optimism
  "9745", // Plasma
  "137", // Polygon
  "534352", // Scroll
  "146", // Sonic
  "130", // Unichain
  "480", // World
])

export function networkSupportsSwaps(chainId: string): boolean
export function networkSupportsSwaps(network: EVMNetwork): boolean
export function networkSupportsSwaps(param: EVMNetwork | string): boolean {
  const chainId = typeof param === "string" ? param : param.chainID

  return NETWORKS_SUPPORTING_SWAPS.has(chainId)
}

/**
 * The most sell token a price or quote can spend, which is also the allowance
 * the swap needs.
 */
export function getMaxSellAmount(
  quote: LiquidSwapPrice | LiquidSwapQuote,
): string {
  return quote.mode === "exact-out" ? quote.maxSellAmount : quote.sellAmount
}

/**
 * The sell token amount a price or quote expects to spend; exact-out swaps
 * refund whatever they don't use.
 */
export function getEstimatedSellAmount(
  quote: LiquidSwapPrice | LiquidSwapQuote,
): string {
  return quote.mode === "exact-out"
    ? quote.estimatedNetSellAmount
    : quote.sellAmount
}

/**
 * The least buy token a price or quote can deliver.
 */
export function getMinBuyAmount(
  quote: LiquidSwapPrice | LiquidSwapQuote,
): string {
  return quote.mode === "exact-out" ? quote.buyAmount : quote.minBuyAmount
}

/**
 * The liquidity sources a price or quote fills the swap from.
 */
export function getRouteFills(
  quote: LiquidSwapPrice | LiquidSwapQuote,
): SwapRouteFill[] {
  return quote.mode === "exact-out"
    ? quote.routes.forward.fills
    : quote.route.fills
}

const API_BASE_URL = "https://api.0x.org/"

const API_KEY = process.env.ZEROX_API_KEY

const assertValidAPIKey: (
  apiKey: string | undefined,
) => asserts apiKey is string = (apiKey) => {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw logger.buildError("Missing 0xSwap API key")
  }
}

function getGatedParameters(
  chainId: string,
): Pick<GetQuoteParams, "swapFeeBps" | "swapFeeRecipient"> {
  // Look up the community multisig address for a specific chain
  const address =
    COMMUNITY_MULTISIG_ADDRESS_BY_CHAINID[chainId] ??
    DEFAULT_COMMUNITY_MULTISIG_ADDRESS
  return {
    swapFeeRecipient: address,
    swapFeeBps: String(SWAP_FEE * 100),
  }
}

/**
 * 0xSwap uses special token addresses for handling base network asset swaps
 */
const get0xAssetAddress = (asset: SwappableAsset) => {
  if (isNetworkBaseAsset(asset)) {
    if (asset.chainID === "5000") {
      return "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000" // Mantle
    }

    // This is how 0x represents network base assets on all other networks
    return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  }

  return asset.contractAddress
}

function isWrapOrUnwrap(
  { sellAsset, buyAsset }: SwapQuoteRequest["assets"],
  { wrappedBaseAssetAddress: wrappedBaseAsset }: EVMNetwork,
): boolean {
  const [baseAsset, otherAsset] = isNetworkBaseAsset(sellAsset)
    ? [sellAsset, buyAsset]
    : [buyAsset, sellAsset]

  return (
    wrappedBaseAsset !== undefined &&
    isNetworkBaseAsset(baseAsset) &&
    !isNetworkBaseAsset(otherAsset) &&
    get0xAssetAddress(otherAsset)?.toLowerCase() === wrappedBaseAsset
  )
}

/**
 * Builds the amount parameter of a 0x price or quote request from whichever
 * side of the swap the user entered. 0x rejects `buyAmount` for wrapping and
 * unwrapping, which trade 1:1, so those always send `sellAmount`.
 */
export function getSwapAmountParams({
  assets,
  amount,
  network,
}: Pick<SwapQuoteRequest, "assets" | "amount" | "network">):
  | { sellAmount: string }
  | { buyAmount: string } {
  if ("sellAmount" in amount) {
    return {
      sellAmount: utils
        .parseUnits(amount.sellAmount, assets.sellAsset.decimals)
        .toString(),
    }
  }

  if (isWrapOrUnwrap(assets, network)) {
    return {
      sellAmount: utils
        .parseUnits(amount.buyAmount, assets.sellAsset.decimals)
        .toString(),
    }
  }

  return {
    buyAmount: utils
      .parseUnits(amount.buyAmount, assets.buyAsset.decimals)
      .toString(),
  }
}

export async function getPrice({
  assets,
  amount,
  network,
}: SwapQuoteRequest & { taker: HexString }) {
  assertValidAPIKey(API_KEY)

  // When available, use smart contract addresses.
  const sellToken = get0xAssetAddress(assets.sellAsset)
  const buyToken = get0xAssetAddress(assets.buyAsset)

  // The /price endpoint is for RFQ-T indicative quotes, while /quote is for
  // firm quotes, which the Taho UI calls "final" quotes that the user
  // intends to fill.

  const params: GetPriceParams = {
    sellToken,
    buyToken,
    chainId: Number(network.chainID),
    ...getSwapAmountParams({ assets, amount, network }),
  }

  const url = new URL("swap/allowance-holder/price", API_BASE_URL)
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.append(k, String(v)),
  )

  const apiData: unknown = await retryWithBackoff(
    () =>
      fetchJson({
        url: url.toString(),
        headers: {
          "0x-api-key": API_KEY,
          "0x-version": "v2",
        },
      }),
    { shouldRetry: isTransientFetchJsonError },
  )

  if (!isValid0xSwapPriceResponse(apiData)) {
    logger.warn(
      "0x Swap quote API call didn't validate, did the 0x API change?",
      apiData,
      isValid0xSwapPriceResponse.errors,
    )

    return null
  }

  return apiData
}

export async function getQuote({
  assets,
  amount,
  slippageTolerance,
  gasPrice,
  network,
  taker,
}: SwapQuoteRequest & { taker: HexString }) {
  assertValidAPIKey(API_KEY)

  // When available, use smart contract addresses.
  const sellToken = get0xAssetAddress(assets.sellAsset)
  const buyToken = get0xAssetAddress(assets.buyAsset)

  // The /price endpoint is for RFQ-T indicative quotes, while /quote is for
  // firm quotes, which the Taho UI calls "final" quotes that the user
  // intends to fill.

  const params: GetQuoteParams = {
    sellToken,
    buyToken,
    chainId: Number(network.chainID),
    slippageBps: slippageTolerance * 100,
    ...getSwapAmountParams({ assets, amount, network }),
    taker,
    gasPrice: gasPrice.toString(),
    ...getGatedParameters(network.chainID),
  }

  const url = new URL("swap/allowance-holder/quote", API_BASE_URL)
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.append(k, String(v)),
  )

  // TODO: Add errorPassThrough and handle Errors
  const apiData: unknown = await retryWithBackoff(
    () =>
      fetchJson({
        url: url.toString(),
        headers: {
          "0x-api-key": API_KEY,
          "0x-version": "v2",
        },
      }),
    { shouldRetry: isTransientFetchJsonError },
  )

  if (!isValid0xSwapQuoteResponse(apiData)) {
    logger.warn(
      "0x Swap quote API call didn't validate, did the 0x API change?",
      apiData,
      isValid0xSwapQuoteResponse.errors,
    )

    return null
  }

  return apiData
}
