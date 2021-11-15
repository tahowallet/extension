import { createSelector, EntityId } from "@reduxjs/toolkit"
import { AccountState } from "../accounts"
import { UIState } from "../ui"
import { ActivitiesState, ActivityItem } from "../activities"

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
  (state: {
    ui: UIState
    activities: ActivitiesState
    account: AccountState
  }) => {
    return {
      activities: state.activities,
      ui: state.ui,
      account: state.account,
    }
  },
  (relevantState) => relevantState
)

export const selectSelectedAccountActivitiesWithTimestamps = createSelector(
  selectAcrossActivityRelevantStates,
  ({ activities, ui, account }) => {
    const activitiesNew = activities[ui.selectedAccount?.address]
    return {
      activities: activitiesNew?.ids?.map(
        (id: EntityId): ActivityItem | undefined => {
          const activityItem = activitiesNew.entities[id]
          if (activityItem) {
            return {
              ...activityItem,
              timestamp:
                activityItem?.blockHeight &&
                account.blocks[activityItem?.blockHeight]?.timestamp,
            }
          }
          return undefined
        }
      ),
    }
  }
)
