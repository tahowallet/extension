import { createSelector, EntityId } from "@reduxjs/toolkit"
import { ActivityItem } from "../activities"
import { selectCurrentAccount } from "./uiSelectors"
import { RootState } from ".."

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
  (state: RootState) => {
    const currentAccount = selectCurrentAccount(state)
    const { address } = currentAccount

    return {
      currentAccountActivities:
        typeof address !== "undefined" ? state.activities[address] : undefined,
    }
  },
  ({ currentAccountActivities }) => {
    return currentAccountActivities?.ids.map((id: EntityId): ActivityItem => {
      // Guaranteed by the fact that we got the id from the ids collection.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const activityItem = currentAccountActivities.entities[id]!

      return {
        ...activityItem,
      }
    })
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
