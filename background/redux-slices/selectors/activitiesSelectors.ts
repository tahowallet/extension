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

      let category: ActivityItem["category"]
      if (activityItem.from.toLowerCase() === ui.currentAccount?.address) {
        category = "Sent"
      } else {
        category = "Received"
      }
      if (activityItem.input !== "0x") {
        category = "Contract interaction"
      }

      return {
        ...activityItem,
        timestamp:
          activityItem?.blockHeight &&
          account.blocks[activityItem?.blockHeight]?.timestamp,
        category,
      }
    })
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
