/* eslint-disable import/prefer-default-export */
import {
  getAssetsState,
  selectFilteredTotalFloorPrice,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  BUILT_IN_NETWORK_BASE_ASSETS,
  ETH,
  USD,
} from "@tallyho/tally-background/constants"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import {
  cleanCachedNFTs,
  refetchCollections,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { useEffect } from "react"
import {
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
  flipPricePoint,
} from "@tallyho/tally-background/assets"
import { useBackgroundDispatch, useBackgroundSelector } from "./redux-hooks"

export const useTotalNFTsFloorPrice = (): {
  totalFloorPriceInETH: string
  totalFloorPriceInUSD: string
} => {
  const assets = useBackgroundSelector(getAssetsState)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const totalFloorPrice = useBackgroundSelector(selectFilteredTotalFloorPrice)
  const ETHPricePoint = selectAssetPricePoint(assets, ETH, mainCurrencySymbol)

  const mainCurrencyTotalPrice = Object.entries(totalFloorPrice).reduce(
    (acc, [symbol, price]) => {
      const baseAsset = BUILT_IN_NETWORK_BASE_ASSETS.find(
        (asset) => asset.symbol === symbol
      )

      if (!baseAsset) return acc

      const pricePoint = selectAssetPricePoint(
        assets,
        baseAsset,
        mainCurrencySymbol
      )

      const enrichedPrice = enrichAssetAmountWithMainCurrencyValues(
        {
          asset: baseAsset,
          amount: BigInt(Math.round(price * 10 ** baseAsset.decimals)),
        },
        pricePoint,
        2
      )

      return acc + (enrichedPrice.mainCurrencyAmount ?? 0)
    },
    0
  )

  const totalFloorPriceInUSD = formatCurrencyAmount(
    mainCurrencySymbol,
    mainCurrencyTotalPrice,
    2
  )

  const floorPriceConvertedToETH =
    ETHPricePoint &&
    convertAssetAmountViaPricePoint(
      {
        asset: USD,
        amount: BigInt(Math.round(mainCurrencyTotalPrice * 10 ** USD.decimals)),
      },
      flipPricePoint(ETHPricePoint)
    )

  const totalFloorPriceInETH =
    (floorPriceConvertedToETH &&
      assetAmountToDesiredDecimals(floorPriceConvertedToETH, 4)) ??
    0

  return {
    totalFloorPriceInETH: totalFloorPriceInETH?.toLocaleString(),
    totalFloorPriceInUSD,
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
