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
    const currentAccountActivities = activities[ui.selectedAccount?.address]
    return currentAccountActivities?.ids.map((id: EntityId): ActivityItem => {
      const activityItem = currentAccountActivities.entities[id] as ActivityItem
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
