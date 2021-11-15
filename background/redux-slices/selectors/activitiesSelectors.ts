import { createSelector, EntityId } from "@reduxjs/toolkit"
import { AccountState } from "../accounts"
import { UIState } from "../ui"
import { ActivitiesState, ActivityItem } from "../activities"

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
  (state: {
    ui: UIState
    activities: ActivitiesState
    account: AccountState
  }) => state,
  ({ activities, ui, account }) => {
    const currentAccountActivities = Object.values(
      activities[ui.selectedAccount?.address]?.entities ?? {}
    )
    return currentAccountActivities?.map((activityItem) => {
      return {
        ...activityItem,
        timestamp:
          activityItem?.blockHeight &&
          account.blocks[activityItem?.blockHeight]?.timestamp,
      }
    })
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
