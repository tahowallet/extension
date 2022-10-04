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
  (state: RootState) => state.activities.activities,
  selectCurrentAccount,
  selectCurrentNetwork,
  (activities, account, network) => {
    return (activities?.[account.address]?.[network.chainID] ?? []).flatMap(
      (activity) => ("type" in activity ? [] : activity.hash)
    )
  }
)
