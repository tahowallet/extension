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
    const currentAccountActivities = ui.currentAccount
      ? activities[ui.currentAccount.address]
      : undefined
    return currentAccountActivities?.ids.map((id: EntityId): ActivityItem => {
      const activityItem = currentAccountActivities.entities[id] as ActivityItem
      const isSent =
        activityItem.from.toLowerCase() === ui.currentAccount?.address
      return {
        ...activityItem,
        timestamp:
          activityItem.blockHeight === null
            ? undefined
            : blocks[activityItem.blockHeight]?.timestamp,
        isSent,
      }
    })
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
