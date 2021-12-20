import { createSelector, EntityId } from "@reduxjs/toolkit"
import { ActivityItem } from "../activities"
import { selectCurrentAccount } from "./uiSelectors"
import { RootState } from ".."

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
  (state: RootState) => {
    const currentAccountAddress = selectCurrentAccount(state).address

    return {
      currentAccountActivities:
        typeof currentAccountAddress !== "undefined"
          ? state.activities[currentAccountAddress]
          : undefined,
      blocks: state.account.blocks,
    }
  },
  ({ currentAccountActivities, blocks }) => {
    return currentAccountActivities?.ids.map((id: EntityId): ActivityItem => {
      // Guaranteed by the fact that we got the id from the ids collection.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const activityItem = currentAccountActivities.entities[id]!

      return {
        ...activityItem,
        timestamp:
          activityItem.blockHeight === null
            ? undefined
            : blocks[activityItem.blockHeight]?.timestamp,
      }
    })
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
