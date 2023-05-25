import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit"
import { PricePoint, SwappableAsset } from "../../assets"
import { USD } from "../../constants"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "../../lib/fixed-point"
import { getPricePoint, getTokenPrices } from "../../lib/prices"
import { EVMNetwork } from "../../networks"
import {
  AssetsState,
  newPricePoint,
  selectAssetPricePoint,
  SingleAssetState,
} from "../assets"
import { enrichAssetAmountWithMainCurrencyValues } from "./asset-utils"
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

export async function checkCurrencyAmount(
  tokenToEthRate: number,
  asset: SwappableAsset,
  assets: AssetsState,
  amount: string,
  network: EVMNetwork,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>
): Promise<string | undefined> {
  /**
   * If the tokenToEthRate of a is less than 0.1
   * we will probably not get information about the price of the asset.
   * The goal is to reduce the number of price requests sent to CoinGecko.
   */
  if (tokenToEthRate < 0.1) {
    return undefined
  }

  const fixedPointAmount = parseToFixedPointNumber(
    fixedPointNumberToString({
      amount: BigInt(amount),
      decimals: asset.decimals,
    }).toString()
  )
  if (typeof fixedPointAmount === "undefined") {
    return undefined
  }
  const decimalMatched = convertFixedPointNumber(
    fixedPointAmount,
    asset.decimals
  )

  let assetPricePoint = selectAssetPricePoint(
    assets,
    asset,
    hardcodedMainCurrencySymbol
  )

  if (!assetPricePoint) {
    const newAssetPricePoint = await getAssetPricePoint(asset, assets, network)

    if (newAssetPricePoint) {
      dispatch(newPricePoint(newAssetPricePoint))
      assetPricePoint = newAssetPricePoint
    }
  }

  return enrichAssetAmountWithMainCurrencyValues(
    {
      asset,
      amount: decimalMatched.amount,
    },
    assetPricePoint,
    2
  )?.localizedMainCurrencyAmount
}
