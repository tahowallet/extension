import { createSelector, createSlice } from "@reduxjs/toolkit"
import {
  AnyAsset,
  flipPricePoint,
  isFungibleAsset,
  isSmartContractFungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
} from "../assets"
import { USD } from "../constants"
import { convertFixedPoint } from "../lib/fixed-point"
import {
  FullAssetID,
  getFullAssetID,
  isSameAsset,
  isTrustedAsset,
} from "./utils/asset-utils"

type AssetPricesMap = {
  [currencySymbol: string]: PricePoint
}

export type PricesState = {
  [assetID: FullAssetID]: AssetPricesMap
}

export const initialState: PricesState = {}

/**
 * Stores price data for trusted assets
 */
const pricesSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {
    newPricePoints: (
      immerState,
      { payload: pricePoints }: { payload: PricePoint[] },
    ) => {
      pricePoints.forEach((pricePoint) => {
        const fiatCurrency = pricePoint.pair.find(
          // FIXME: What if we have price points not in USD?
          (asset) => asset.symbol === USD.symbol,
        )

        const [pricedAsset] = pricePoint.pair.filter(
          (asset) => asset !== fiatCurrency,
        )

        if (fiatCurrency && isTrustedAsset(pricedAsset)) {
          const assetId = getFullAssetID(pricedAsset)

          immerState[assetId] ??= {}
          immerState[assetId][fiatCurrency.symbol] = pricePoint
        }
      })
    },
    updatePriceAssetReferences: (
      immerState,
      { payload: assets }: { payload: SmartContractFungibleAsset[] },
    ) => {
      assets.forEach((asset) => {
        const assetId = getFullAssetID(asset)

        Object.values(immerState[assetId] ?? {}).forEach((immerPricePoint) => {
          const updateIndex = immerPricePoint.pair.findIndex((priceAsset) =>
            isSameAsset(asset, priceAsset),
          )
          if (updateIndex > -1) {
            Object.assign(immerPricePoint.pair[updateIndex], asset)
          }
        })
      })
    },
  },
})

export const { newPricePoints, updatePriceAssetReferences } =
  pricesSlice.actions

export default pricesSlice.reducer

const selectPricesState = (state: PricesState) => state
const selectAsset = (_: PricesState, asset: AnyAsset) => asset

const selectPairedAssetSymbol = (
  _: PricesState,
  _2: AnyAsset,
  pairedAssetSymbol: string,
) => pairedAssetSymbol

/**
 * Selects a particular asset price point given the asset symbol and the paired
 * asset symbol used to price it.
 *
 * For example, calling `selectAssetPricePoint(state.assets, ETH, "USD")`
 * will return the ETH-USD price point, if it exists. Note that this selector
 * guarantees that the returned price point will have the pair in the specified
 * order, so even if the store price point has amounts in the order [USD, ETH],
 * the selector will return them in the order [ETH, USD].
 */
export const selectAssetPricePoint = createSelector(
  [selectPricesState, selectAsset, selectPairedAssetSymbol],
  (prices, assetToFind, pairedAssetSymbol) => {
    /* Don't do anything if this is an unverified asset */
    if (!isTrustedAsset(assetToFind)) {
      return undefined
    }

    const getTargetAssetFromPricePoint = (pricePoint: PricePoint) =>
      pricePoint.pair.filter(({ symbol }) => symbol !== pairedAssetSymbol)[0]

    const hasPriceData = (
      assetPriceData: AssetPricesMap | undefined,
    ): boolean => !!assetPriceData?.[pairedAssetSymbol]

    let pricedAsset: AssetPricesMap | undefined

    /* If we're looking for a smart contract, try to find an exact price point */
    if (isSmartContractFungibleAsset(assetToFind)) {
      const assetID = getFullAssetID(assetToFind)

      if (hasPriceData(prices[assetID])) {
        pricedAsset = prices[assetID]
      }
    }

    /* Otherwise, find a best-effort match by looking for assets with the same symbol  */
    if (!pricedAsset) {
      pricedAsset = Object.values(prices).find((assetPriceData) => {
        if (!hasPriceData(assetPriceData)) return false

        return (
          getTargetAssetFromPricePoint(assetPriceData[pairedAssetSymbol])
            .symbol === assetToFind.symbol
        )
      })
    }

    if (pricedAsset) {
      let pricePoint = pricedAsset[pairedAssetSymbol]

      // Flip it if the price point looks like USD-ETH
      if (pricePoint.pair[0].symbol !== assetToFind.symbol) {
        pricePoint = flipPricePoint(pricePoint)
      }

      const assetDecimals = isFungibleAsset(assetToFind)
        ? assetToFind.decimals
        : 0
      const pricePointAssetDecimals = isFungibleAsset(pricePoint.pair[0])
        ? pricePoint.pair[0].decimals
        : 0

      if (assetDecimals !== pricePointAssetDecimals) {
        const { amounts } = pricePoint
        pricePoint = {
          ...pricePoint,
          amounts: [
            convertFixedPoint(
              amounts[0],
              pricePointAssetDecimals,
              assetDecimals,
            ),
            amounts[1],
          ],
        }
      }

      return pricePoint
    }

    // If no matching priced asset was found, return undefined.
    return undefined
  },
)
