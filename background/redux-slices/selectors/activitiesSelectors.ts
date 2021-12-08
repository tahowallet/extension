import { createSelector, EntityId } from "@reduxjs/toolkit"
import { AccountState } from "../accounts"
import { UIState } from "../ui"
import { ActivitiesState, ActivityItem } from "../activities"

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
  (state: {
    ui: UIState
    activities: ActivitiesState
    account: AccountState
  }) => ({
    currentAccountAddress: state.ui.currentAccount?.address,
    currentAccountActivities:
      typeof state.ui.currentAccount !== "undefined"
        ? state.activities[state.ui.currentAccount?.address]
        : undefined,
    blocks: state.account.blocks,
  }),
  ({ currentAccountAddress, currentAccountActivities, blocks }) => {
    return currentAccountActivities?.ids.map((id: EntityId): ActivityItem => {
      // Guaranteed by the fact that we got the id from the ids collection.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const activityItem = currentAccountActivities.entities[id]!

      const isSent = activityItem.from.toLowerCase() === currentAccountAddress
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
