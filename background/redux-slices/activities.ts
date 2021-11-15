import { createEntityAdapter, createSlice, EntityState } from "@reduxjs/toolkit"
import { keysMap, adaptForUI, ActivityItem } from "./utils"

export { ActivityItem }

const activitiesAdapter = createEntityAdapter<ActivityItem>({
  selectId: (activityItem) => activityItem.hash,
  sortComparer: (a, b) => (a.blockHeight < b.blockHeight ? 1 : -1),
})

export type ActivitiesState = {
  [address: string]: EntityState<ActivityItem>
}

export const initialState: ActivitiesState = {}

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    activityEncountered: (immerState, { payload }) => {
      const activityItem = payload.transaction

      if (activityItem.blockHeight) {
        const infoRows = adaptForUI(keysMap, activityItem)

        payload.forAccounts.forEach((account: string) => {
          const address = account.toLowerCase()

          if (!immerState[address]) {
            immerState[address] = activitiesAdapter.getInitialState()
          }

          activitiesAdapter.upsertOne(immerState[address], {
            ...activityItem,
            infoRows,
          })
        })
      }
    },
  },
})

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
