import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { ActivityItem } from "../activities"

const mainCurrencySymbol = "USD"

export const selectShowingActivityDetail = createSelector(
  (state: RootState) => state.activities,
  (state: RootState) => state.ui.showingActivityDetailID,
  (activities, showingActivityDetailID) => {
    return showingActivityDetailID === null
      ? null
      : Object.values(activities)
          .map<ActivityItem | undefined>(
            (accountActivities) =>
              accountActivities.entities[showingActivityDetailID]
          )
          .find((activity) => typeof activity !== "undefined")
  }
)

export const selectCurrentAccount = createSelector(
  (state: RootState) => state.ui.currentAccount,
  ({ addressNetwork: { address }, truncatedAddress }) => ({
    address,
    truncatedAddress,
  })
)

export const selectCurrentAddressNetwork = createSelector(
  (state: RootState) => state.ui.currentAccount,
  (currentAccount) => currentAccount
)

export const selectMainCurrency = createSelector(
  (state: RootState) => state.ui,
  (state: RootState) => state.assets,
  (_, assets) => assets.find((asset) => asset.symbol === mainCurrencySymbol)
)
