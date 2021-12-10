import { createSelector, EntityId } from "@reduxjs/toolkit"
import { RootState } from ".."
import { ActivityItem } from "../activities"

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
  (state: RootState) => state.ui.currentAccount?.address,
  (state: RootState) => state.activities,
  (state: RootState) => state.account.blocks,
  (currentAddress, activities, blocks) => {
    const currentAccountActivities = currentAddress
      ? activities[currentAddress]
      : undefined
    return currentAccountActivities?.ids.map((id: EntityId): ActivityItem => {
      const activityItem = currentAccountActivities.entities[id] as ActivityItem
      const isSent = activityItem.from.toLowerCase() === currentAddress
      return {
        ...activityItem,
        timestamp:
          activityItem?.blockHeight &&
          blocks[activityItem?.blockHeight]?.timestamp,
        isSent,
      }
    })
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
