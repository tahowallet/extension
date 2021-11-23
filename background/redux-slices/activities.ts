import { createEntityAdapter, createSlice, EntityState } from "@reduxjs/toolkit"
import {
  keysMap,
  adaptForUI,
  ActivityItem,
  determineActivityDecimalValue,
  determineToken,
} from "./utils/activity-utils"

export { ActivityItem }

const activitiesAdapter = createEntityAdapter<ActivityItem>({
  selectId: (activityItem) => activityItem.hash,
  sortComparer: (a, b) => {
    if (a.blockHeight === b.blockHeight) {
      return 0
    }
    if (a.blockHeight < b.blockHeight) {
      return 1
    }
    return -1
  },
})

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(37, 41)}`
}

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
            fromTruncated: truncateAddress(activityItem.from),
            toTruncated: truncateAddress(activityItem.to),
            tokenDecimalValue: determineActivityDecimalValue(activityItem),
          })
        })
      }
    },
  },
})

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
