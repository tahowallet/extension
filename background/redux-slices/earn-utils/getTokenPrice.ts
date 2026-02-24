import { BigNumber } from "ethers"
import { PricesState, selectAssetPricePoint } from "../prices"
import type { HexString } from "../../types"
import { AnyAsset, PricePoint } from "../../assets"
import getCurveLPTokenPrice from "./getCurveLPTokenPrice"
import getUniswapPairTokenPrice from "./getUniswapPairTokenPrice"

const getTokenPrice = async (
  asset: AnyAsset & { decimals: number; contractAddress: HexString },
  prices: PricesState,
): Promise<{ singleTokenPrice: bigint; pricePoint: PricePoint }> => {
  const mainCurrencySymbol = "USD"
  let tokenPrice
  if (asset.symbol.startsWith("crv") || asset.symbol.startsWith("YFIETH")) {
    tokenPrice = await getCurveLPTokenPrice(asset.contractAddress) // in USD bigint with 10 decimals
  } else if (asset.symbol.startsWith("UNI-V2")) {
    tokenPrice = await getUniswapPairTokenPrice(
      asset.contractAddress,
      prices,
      mainCurrencySymbol,
    ) // in USD bigint with 10 decimals
  } else {
    // assetPricePoint.amounts[1] returns USD value with 10 decimals
    const assetPricePoint = selectAssetPricePoint(
      prices,
      asset,
      mainCurrencySymbol,
    )
    tokenPrice = assetPricePoint?.amounts[1]

    if (typeof tokenPrice === "undefined") {
      tokenPrice = 0n
    }
  }
  const bigIntDecimals = BigNumber.from("10")
    .pow(BigNumber.from(asset.decimals))
    .toBigInt()
  const USDAsset = {
    name: "United States Dollar",
    symbol: "USD",
    decimals: 10,
  }
  const imitatedPricePoint = {
    pair: [asset, USDAsset],
    amounts: [bigIntDecimals, tokenPrice],
    time: Date.now(),
  } as PricePoint

  return { singleTokenPrice: tokenPrice, pricePoint: imitatedPricePoint }
}

export default getTokenPrice
