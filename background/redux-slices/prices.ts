import { createSelector, createSlice } from "@reduxjs/toolkit"
import {
  AnyAsset,
  flipPricePoint,
  isFungibleAsset,
  isSmartContractFungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
} from "../assets"
import { FIAT_CURRENCIES_SYMBOL } from "../constants"
import { convertFixedPoint } from "../lib/fixed-point"
import {
  FullAssetID,
  getFullAssetID,
  isNetworkBaseAsset,
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

const pricesSlice = createSlice({
  name: "prices",
  initialState,
  reducers: {
    newPricePoints: (
      immerState,
      { payload: pricePoints }: { payload: PricePoint[] },
    ) => {
      pricePoints.forEach((pricePoint) => {
        const fiatCurrency = pricePoint.pair.find((asset) =>
          FIAT_CURRENCIES_SYMBOL.includes(asset.symbol),
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
 *
 * Network base assets and smart contract tokens are priced by their own price
 * point first, such as `42161/base` for Arbitrum ETH. Trusted assets without
 * one fall back to the first price point for an asset with the same symbol.
 * Note that untrusted tokens never fall back, since a token that borrows
 * another's symbol would otherwise be valued as if it were the real thing.
 */
export const selectAssetPricePoint = createSelector(
  [selectPricesState, selectAsset, selectPairedAssetSymbol],
  (prices, assetToFind, pairedAssetSymbol) => {
    const getTargetAssetFromPricePoint = (pricePoint: PricePoint) =>
      pricePoint.pair.filter(({ symbol }) => symbol !== pairedAssetSymbol)[0]

    const hasRecentPriceData = (
      assetPriceData: AssetPricesMap | undefined,
    ): boolean => !!assetPriceData?.[pairedAssetSymbol]

    let pricedAsset: AssetPricesMap | undefined

    // A base asset's own price comes first, so Arbitrum ETH (42161/base) uses
    // its own price rather than whichever ETH price was stored first, such as
    // mainnet's 1/base.
    if (isNetworkBaseAsset(assetToFind)) {
      const assetID = getFullAssetID(assetToFind)

      if (hasRecentPriceData(prices[assetID])) {
        pricedAsset = prices[assetID]
      }
    }

    /* If we're looking for a smart contract, try to find an exact price point */
    if (isSmartContractFungibleAsset(assetToFind)) {
      const assetID = getFullAssetID(assetToFind)

      if (hasRecentPriceData(prices[assetID])) {
        pricedAsset = prices[assetID]
      }

      /* Don't do anything else if this is an unverified asset and there's no exact match */
      if (!isTrustedAsset(assetToFind)) {
        return undefined
      }
    }

    /* Otherwise, find a best-effort match by looking for assets with the same symbol  */
    if (!pricedAsset) {
      pricedAsset = Object.values(prices).find(
        (assetPriceData) =>
          hasRecentPriceData(assetPriceData) &&
          getTargetAssetFromPricePoint(assetPriceData[pairedAssetSymbol])
            .symbol === assetToFind.symbol,
      )
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
