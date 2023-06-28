import { PricePoint, SwappableAsset } from "../../assets"
import { USD } from "../../constants"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "../../lib/fixed-point"
import { getPricePoint, getTokenPrices } from "../../lib/prices"
import { EVMNetwork } from "../../networks"
import { AssetsState, SingleAssetState } from "../assets"
import { PricesState, selectAssetPricePoint } from "../prices"
import {
  AssetMainCurrencyAmount,
  enrichAssetAmountWithMainCurrencyValues,
} from "./asset-utils"
import { hardcodedMainCurrencySymbol } from "./constants"

type SwapAssets = {
  sellAsset: SwappableAsset
  buyAsset: SwappableAsset
}

type SwapAmount =
  | {
      sellAmount: string
    }
  | {
      buyAmount: string
    }

export type SwapQuoteRequest = {
  assets: SwapAssets
  amount: SwapAmount
  slippageTolerance: number
  gasPrice: bigint
  network: EVMNetwork
}

export type PriceDetails = {
  priceImpact?: number
  buyCurrencyAmount?: string
  sellCurrencyAmount?: string
}

export async function getAssetPricePoint(
  asset: SwappableAsset,
  assets: AssetsState,
  network: EVMNetwork
): Promise<PricePoint | undefined> {
  // FIXME: review
  const assetPricesNetworks = assets
    .filter(
      (assetItem) =>
        "contractAddress" in assetItem &&
        assetItem.contractAddress &&
        assetItem.symbol === asset.symbol
    )
    .map((assetItem) => {
      const { contractAddress } = assetItem as SingleAssetState & {
        contractAddress: string
      }
      return contractAddress
    })

  const [unitPricePoint] = Object.values(
    await getTokenPrices(assetPricesNetworks, USD, network)
  )

  return unitPricePoint === undefined
    ? undefined
    : getPricePoint(asset, unitPricePoint)
}

export async function getAssetAmount(
  assets: AssetsState,
  prices: PricesState,
  asset: SwappableAsset,
  amount: string,
  network: EVMNetwork
): Promise<
  | ({
      asset: SwappableAsset
      amount: bigint
    } & AssetMainCurrencyAmount)
  | undefined
> {
  const fixedPointAmount = parseToFixedPointNumber(amount.toString())
  if (typeof fixedPointAmount === "undefined") {
    return undefined
  }
  const decimalMatched = convertFixedPointNumber(
    fixedPointAmount,
    asset.decimals
  )

  const assetPricePoint = selectAssetPricePoint(
    prices,
    asset,
    hardcodedMainCurrencySymbol
  )

  return enrichAssetAmountWithMainCurrencyValues(
    {
      asset,
      amount: decimalMatched.amount,
    },
    assetPricePoint ?? (await getAssetPricePoint(asset, assets, network)),
    2
  )
}

/**
 * If the tokenToEthRate of a is less than 0.1
 * we will probably not get information about the price of the asset.
 * The goal is to reduce the number of price requests sent to CoinGecko.
 */
export async function checkCurrencyAmount(
  tokenToEthRate: number,
  asset: SwappableAsset,
  assets: AssetsState,
  prices: PricesState,
  amount: string,
  network: EVMNetwork
): Promise<string | undefined> {
  const currencyAmount =
    tokenToEthRate >= 0.1
      ? (
          await getAssetAmount(
            assets,
            prices,
            asset,
            fixedPointNumberToString({
              amount: BigInt(amount),
              decimals: asset.decimals,
            }),
            network
          )
        )?.localizedMainCurrencyAmount
      : undefined

  return currencyAmount
}
