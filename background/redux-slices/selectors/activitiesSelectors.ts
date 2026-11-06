import { selectCurrentSparkActivities } from "./sparkSelectors"
import { createSelector } from "@reduxjs/toolkit"
import { selectCurrentAccount, selectCurrentNetwork } from "./uiSelectors"
import { RootState } from ".."

export const selectCurrentAccountActivities = createSelector(
  (state: RootState) => state.activities.activities,
  selectCurrentAccount,
  selectCurrentNetwork,
  (state: RootState) => state.ui.selectedSparkChainID,
  selectCurrentSparkActivities,
  (activities, account, network, selectedSparkChainID, sparkActivities) =>
    selectedSparkChainID
      ? sparkActivities
      : (activities?.[account.address]?.[network.chainID] ?? []),
)

export const selectActivitesHashesForEnrichment = createSelector(
  selectCurrentAccountActivities,
  (currentActivities) =>
    currentActivities.flatMap((activity) =>
      "type" in activity ? [] : activity.hash,
    ),
)
