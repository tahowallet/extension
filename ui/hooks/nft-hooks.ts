import {
  getPricesState,
  selectDisplayCurrency,
  selectFilteredTotalFloorPrice,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  convertUSDPricePointToCurrency,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  BUILT_IN_NETWORK_BASE_ASSETS,
  ETH,
  USD,
} from "@tallyho/tally-background/constants"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/prices"
import {
  cleanCachedNFTs,
  refetchCollections,
} from "@tallyho/tally-background/redux-slices/nfts"
import { useEffect } from "react"
import {
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
  flipPricePoint,
} from "@tallyho/tally-background/assets"
import { currencies } from "@thesis-co/cent"
import { useBackgroundDispatch, useBackgroundSelector } from "./redux-hooks"

export const useTotalNFTsFloorPrice = (): {
  totalFloorPriceInETH: string
  totalFloorPriceInUSD: string
} => {
  const totalFloorPrice = useBackgroundSelector(selectFilteredTotalFloorPrice)
  const allPrices = useBackgroundSelector(getPricesState)
  const displayCurrency = useBackgroundSelector(selectDisplayCurrency)

  const usdPricePoint = selectAssetPricePoint(allPrices, ETH, USD.symbol)!

  const ETHPricePoint = convertUSDPricePointToCurrency(
    usdPricePoint,
    displayCurrency,
  )

  const mainCurrencyTotalPrice = Object.entries(totalFloorPrice).reduce(
    (acc, [symbol, price]) => {
      const baseAsset = BUILT_IN_NETWORK_BASE_ASSETS.find(
        (asset) => asset.symbol === symbol,
      )

      if (!baseAsset) return acc

      const pricePoint = selectAssetPricePoint(allPrices, baseAsset, USD.symbol)

      const enrichedPrice = enrichAssetAmountWithMainCurrencyValues(
        {
          asset: baseAsset,
          amount: BigInt(Math.round(price * 10 ** baseAsset.decimals)),
        },
        pricePoint,
        2,
        displayCurrency,
      )

      // TODO: Refactor this to aggregate a usd asset amount

      return acc + (enrichedPrice.mainCurrencyAmount ?? 0)
    },
    0,
  )

  const totalFloorPriceValue = formatCurrencyAmount(
    displayCurrency.code,
    mainCurrencyTotalPrice,
    2,
  )

  const floorPriceConvertedToETH =
    ETHPricePoint &&
    convertAssetAmountViaPricePoint(
      {
        asset: currencies[displayCurrency.code],
        amount: BigInt(
          Math.round(
            mainCurrencyTotalPrice *
              10 ** Number(currencies[displayCurrency.code].decimals),
          ),
        ),
      },
      flipPricePoint(ETHPricePoint),
    )

  const totalFloorPriceInETH =
    (floorPriceConvertedToETH &&
      assetAmountToDesiredDecimals(floorPriceConvertedToETH, 4)) ??
    0

  return {
    totalFloorPriceInETH: totalFloorPriceInETH?.toLocaleString(),
    totalFloorPriceInUSD: totalFloorPriceValue.toString(),
  }
}

export const useNFTsReload = (): void => {
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    dispatch(refetchCollections())
    return () => {
      dispatch(cleanCachedNFTs())
    }
  }, [dispatch])
}
