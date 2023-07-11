import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentAccount, selectCurrentNetwork } from "./uiSelectors"
import { RootState } from ".."

export const selectCurrentAccountActivities = createSelector(
  (state: RootState) => state.activities.activities,
  selectCurrentAccount,
  selectCurrentNetwork,
  (activities, account, network) => {
    return activities?.[account.address]?.[network.chainID] ?? []
  }
)

export const selectActivitesHashesForEnrichment = createSelector(
  selectCurrentAccountActivities,
  (currentActivities) => {
    return currentActivities.flatMap((activity) =>
      "type" in activity ? [] : activity.hash
    )
  }
)

export const selectTrackedReplacementTransactions = createSelector(
  (state: RootState) => state.activities,
  (activities) => activities.replacementTransactions
)

export const selectTransactionToReplace = createSelector(
  (state: RootState) => state.activities,
  (activities) => activities.transactionToReplace
)
