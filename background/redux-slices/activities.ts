import { createSlice } from "@reduxjs/toolkit"
import { keysMap, adaptForUI, ActivityItem } from "./utils"

export { ActivityItem }

export type ActivitiesState = {
  [address: string]: ActivityItem[]
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
            immerState[address] = []
          }

          immerState[address].push({
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
