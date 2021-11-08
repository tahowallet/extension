import { createSlice } from "@reduxjs/toolkit"
import { keysMap, adaptForUI, ActivityItem } from "./utils"

export { ActivityItem }

export type ActivitiesState = {
  [address: string]: ActivityItem[]
}

export const initialState: ActivitiesState = {}

const insertActivityItemSorted = (
  activityItems: ActivityItem[],
  activityItem: ActivityItem
) => {
  let low = 0
  let high = activityItems.length

  while (low < high) {
    const mid = (low + high) / 2

    if (activityItems[mid]?.blockHeight) {
      if (activityItems[mid].blockHeight > activityItem.blockHeight) {
        low = mid + 1
      } else {
        high = mid
      }
    }
  }

  activityItems.splice(low, 0, activityItem)
}

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

          insertActivityItemSorted(immerState[address], {
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
