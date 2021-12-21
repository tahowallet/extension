import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { ActivityItem } from "../activities"

const mainCurrencySymbol = "USD"

export const selectShowingActivityDetail = createSelector(
  (state: RootState) => state.activities,
  (state: RootState) => state.ui.showingActivityDetailID,
  (state: RootState) => {
    const { network } = state.ui.selectedAccount
    return state.networks.networkData[network.chainID].blocks
  },
  (activities, showingActivityDetailID, blocks) => {
    return showingActivityDetailID === null
      ? null
      : Object.values(activities)
          .map<ActivityItem | undefined>(
            (accountActivities) =>
              accountActivities.entities[showingActivityDetailID]
          )
          // Filter/slice lets us use map after instead of assigning a var.
          .filter(
            (activity): activity is ActivityItem =>
              typeof activity !== "undefined"
          )
          .slice(0, 1)
          .map((activityItem) => ({
            ...activityItem,
            timestamp:
              activityItem.blockHeight === null
                ? undefined
                : blocks[activityItem.blockHeight]?.timestamp,
          }))[0]
  }
)

export const selectCurrentAccount = createSelector(
  (state: RootState) => state.ui.selectedAccount,
  ({ address, network }) => ({
    address,
    network,
    truncatedAddress: address.toLowerCase().slice(0, 7),
  })
)

export const selectCurrentAddressNetwork = createSelector(
  (state: RootState) => state.ui.selectedAccount,
  (selectedAccount) => selectedAccount
)

export const selectMainCurrency = createSelector(
  (state: RootState) => state.ui,
  (state: RootState) => state.assets,
  (_, assets) => assets.find((asset) => asset.symbol === mainCurrencySymbol)
)
