import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentAccount, selectCurrentNetwork } from "./uiSelectors"
import { RootState } from ".."

export const selectCurrentAccountActivities = createSelector(
  (state: RootState) => state.activities.activities,
  selectCurrentAccount,
  selectCurrentNetwork,
  (activities, account, network) =>
    activities?.[account.address]?.[network.chainID] ?? [],
)

export const selectActivitesHashesForEnrichment = createSelector(
  selectCurrentAccountActivities,
  (currentActivities) =>
    currentActivities.flatMap((activity) =>
      "type" in activity ? [] : activity.hash,
    ),
)
