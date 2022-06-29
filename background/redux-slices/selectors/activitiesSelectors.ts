import { createSelector, EntityId } from "@reduxjs/toolkit"
import { ActivityItem } from "../activities"
import { selectCurrentAccount, selectCurrentNetwork } from "./uiSelectors"
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
  selectCurrentNetwork,
  ({ currentAccountActivities }, network) => {
    return currentAccountActivities?.[network.chainID]?.ids.map(
      (id: EntityId): ActivityItem => {
        const activityItem =
          // Guaranteed by the fact that we got the id from the ids collection.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          currentAccountActivities[network.chainID].entities[id]!

        return {
          ...activityItem,
        }
      }
    )
  }
)

export default selectCurrentAccountActivitiesWithTimestamps
