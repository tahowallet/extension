import {
  FungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
} from "../../assets"
import { USD } from "../../constants"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "../../lib/fixed-point"
import { getPricePoint, getTokenPrices } from "../../lib/prices"
import { EVMNetwork } from "../../networks"
import { AssetsState, selectAssetPricePoint, SingleAssetState } from "../assets"
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

export async function getAssetPricePoint(
  asset: SmartContractFungibleAsset | FungibleAsset,
  assets: AssetsState,
  network: EVMNetwork
): Promise<PricePoint | undefined> {
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
  asset: SmartContractFungibleAsset | FungibleAsset,
  amount: string,
  network: EVMNetwork
): Promise<
  | ({
      asset: FungibleAsset | SmartContractFungibleAsset
      amount: bigint
    } & AssetMainCurrencyAmount)
  | undefined
> {
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
    assetPricePoint ?? (await getAssetPricePoint(asset, assets, network)),
    2
  )
}

export function getPriceImpact(
  buyCurrencyAmount: number | undefined,
  sellCurrencyAmount: number | undefined
): number | undefined {
  if (buyCurrencyAmount && sellCurrencyAmount) {
    return +((buyCurrencyAmount / sellCurrencyAmount - 1) * 100).toFixed(2)
  }
  return undefined
}

export async function calculatePriceDetails(
  quoteRequest: SwapQuoteRequest,
  assets: AssetsState,
  sellAmount: string,
  buyAmount: string
): Promise<PriceDetails> {
  const assetSellAmount = await getAssetAmount(
    assets,
    quoteRequest.assets.sellAsset,
    fixedPointNumberToString({
      amount: BigInt(sellAmount),
      decimals: quoteRequest.assets.sellAsset.decimals,
    }),
    quoteRequest.network
  )

  const assetBuyAmount = await getAssetAmount(
    assets,
    quoteRequest.assets.buyAsset,
    fixedPointNumberToString({
      amount: BigInt(buyAmount),
      decimals: quoteRequest.assets.buyAsset.decimals,
    }),
    quoteRequest.network
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
