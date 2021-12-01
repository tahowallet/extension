import { createSelector } from "@reduxjs/toolkit"
import { selectHideDust } from "../ui"
import { RootState } from ".."
import { CompleteAssetAmount } from "../accounts"
import { selectAssetPricePoint } from "../assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
} from "../utils/asset-utils"
import {
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
} from "../../assets"

// TODO What actual precision do we want here? Probably more than 2
// TODO decimals? Maybe it's configurable?
const desiredDecimals = 2
// TODO Make this a setting.
const mainCurrencySymbol = "USD"
// TODO Make this a setting.
const userValueDustThreshold = 2

const getAccountState = (state: RootState) => state.account
const getAssetsState = (state: RootState) => state.assets

// eslint-disable-next-line import/prefer-default-export
export const selectAccountAndTimestampedActivities = createSelector(
  getAccountState,
  getAssetsState,
  selectHideDust,
  (account, assets, hideDust) => {
    // Derive activities with timestamps included
    const activity = account.combinedData.activity.map((activityItem) => {
      const isSent =
        activityItem.from.toLowerCase() ===
        Object.keys(account.accountsData)[0].toLowerCase()

      return {
        ...activityItem,
        ...(activityItem.blockHeight && {
          timestamp: account?.blocks[activityItem.blockHeight]?.timestamp,
        }),
        isSent,
      }
    })

    // Keep a tally of the total user value; undefined if no main currency data
    // is available.
    let totalMainCurrencyAmount: number | undefined

    // Derive account "assets"/assetAmount which include USD values using
    // data from the assets slice
    const accountAssets = account.combinedData.assets
      .map<CompleteAssetAmount>((assetItem) => {
        const assetPricePoint = selectAssetPricePoint(
          assets,
          assetItem.asset.symbol,
          mainCurrencySymbol
        )

        if (assetPricePoint) {
          const enrichedAssetAmount = enrichAssetAmountWithDecimalValues(
            enrichAssetAmountWithMainCurrencyValues(
              assetItem,
              assetPricePoint,
              desiredDecimals
            ),
            desiredDecimals
          )

          if (typeof enrichedAssetAmount.mainCurrencyAmount !== "undefined") {
            totalMainCurrencyAmount ??= 0 // initialize if needed
            totalMainCurrencyAmount += enrichedAssetAmount.mainCurrencyAmount
          }

          return enrichedAssetAmount
        }

        return enrichAssetAmountWithDecimalValues(assetItem, desiredDecimals)
      })
      .filter((assetItem) => {
        const isNotDust =
          typeof assetItem.mainCurrencyAmount === "undefined"
            ? true
            : assetItem.mainCurrencyAmount > userValueDustThreshold
        const isPresent = assetItem.decimalAmount > 0

        // Hide dust and missing amounts.
        return hideDust ? isNotDust && isPresent : isPresent
      })

    return {
      combinedData: {
        assets: accountAssets,
        totalMainCurrencyValue: totalMainCurrencyAmount
          ? formatCurrencyAmount(
              mainCurrencySymbol,
              totalMainCurrencyAmount,
              desiredDecimals
            )
          : undefined,
        activity: account.combinedData.activity,
      },
      accountData: account.accountsData,
      activity,
    }
  }
)
