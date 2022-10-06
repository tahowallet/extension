import { FungibleAsset, SmartContractFungibleAsset } from "../../assets"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "../../lib/fixed-point"
import { EVMNetwork } from "../../networks"
import { AssetsState, selectAssetPricePoint } from "../assets"
import {
  AssetMainCurrencyAmount,
  enrichAssetAmountWithMainCurrencyValues,
} from "./asset-utils"

interface SwapAssets {
  sellAsset: SmartContractFungibleAsset | FungibleAsset
  buyAsset: SmartContractFungibleAsset | FungibleAsset
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
  priceImpact: number | undefined
  buyCurrencyAmount: string | undefined
  sellCurrencyAmount: string | undefined
}

export function getAssetAmount(
  assets: AssetsState,
  asset: SmartContractFungibleAsset | FungibleAsset,
  amount: string
):
  | ({
      asset: FungibleAsset | SmartContractFungibleAsset
      amount: bigint
    } & AssetMainCurrencyAmount)
  | undefined {
  const mainCurrencySymbol = "USD"

  const fixedPointAmount = parseToFixedPointNumber(amount.toString())
  if (typeof fixedPointAmount === "undefined") {
    return undefined
  }
  const decimalMatched = convertFixedPointNumber(
    fixedPointAmount,
    asset.decimals
  )

  const assetPricePoint = selectAssetPricePoint(
    assets,
    asset?.symbol,
    mainCurrencySymbol
  )
  return enrichAssetAmountWithMainCurrencyValues(
    {
      asset,
      amount: decimalMatched.amount,
    },
    assetPricePoint,
    2
  )
}

export function getPriceImpact(
  buyCurrencyAmount: number | undefined,
  sellCurrencyAmount: number | undefined
): number | undefined {
  if (buyCurrencyAmount && sellCurrencyAmount) {
    return +(buyCurrencyAmount / sellCurrencyAmount - 1).toFixed(2)
  }
  return undefined
}

export function calculatePriceDetails(
  quoteRequest: SwapQuoteRequest,
  assets: AssetsState,
  sellAmount: string,
  buyAmount: string
): PriceDetails {
  const assetSellAmount = getAssetAmount(
    assets,
    quoteRequest.assets.sellAsset,
    fixedPointNumberToString({
      amount: BigInt(sellAmount),
      decimals: quoteRequest.assets.sellAsset.decimals,
    })
  )

  const assetBuyAmount = getAssetAmount(
    assets,
    quoteRequest.assets.buyAsset,
    fixedPointNumberToString({
      amount: BigInt(buyAmount),
      decimals: quoteRequest.assets.buyAsset.decimals,
    })
  )

  const priceImpact = getPriceImpact(
    assetBuyAmount?.mainCurrencyAmount,
    assetSellAmount?.mainCurrencyAmount
  )

  return {
    buyCurrencyAmount: assetBuyAmount?.localizedMainCurrencyAmount,
    sellCurrencyAmount: assetSellAmount?.localizedMainCurrencyAmount,
    priceImpact,
  }
}
