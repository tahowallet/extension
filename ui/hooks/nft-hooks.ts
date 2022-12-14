/* eslint-disable import/prefer-default-export */
import {
  getAssetsState,
  selectMainCurrencySymbol,
  selectTotalFloorPriceInETH,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { ETH } from "@tallyho/tally-background/constants"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import {
  cleanCachedNFTs,
  refetchCollections,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { useEffect } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "./redux-hooks"

export const useTotalNFTsFloorPrice = (): {
  totalFloorPriceInETH: string
  totalFloorPriceInUSD: string
} => {
  const assets = useBackgroundSelector(getAssetsState)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const totalFloorPriceInETH = useBackgroundSelector(selectTotalFloorPriceInETH)

  const totalFloorPriceInETHFormatted = formatCurrencyAmount(
    mainCurrencySymbol,
    totalFloorPriceInETH,
    4
  )
  const ETHPricePoint = selectAssetPricePoint(
    assets,
    ETH.symbol,
    mainCurrencySymbol
  )

  const totalFloorPriceLocalized =
    enrichAssetAmountWithMainCurrencyValues(
      {
        asset: ETH,
        amount: BigInt(Math.round(totalFloorPriceInETH * 10 ** ETH.decimals)),
      },
      ETHPricePoint,
      2
    ).localizedMainCurrencyAmount ?? "-"

  return {
    totalFloorPriceInETH: totalFloorPriceInETHFormatted,
    totalFloorPriceInUSD: totalFloorPriceLocalized,
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
