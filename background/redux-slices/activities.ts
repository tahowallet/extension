import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AnyEVMTransaction } from "../types"

export type ActivityItem = AnyEVMTransaction & {
  timestamp?: number
  value: bigint
  from?: string
  isSent?: boolean
}

export type ActivitiesState = {
  activities: {
    [address: string]: {
      [hash: string]: ActivityItem
    }
  }
}

export const initialState: ActivitiesState = {
  activities: {},
}

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    activityEncountered: (immerState, { payload: activityItem }) => {
      const from = activityItem.from.toLowerCase()

      // TODO handle more than "from", and confirm it's an
      // added account first
      if (!immerState.activities[from]) {
        immerState.activities[from] = {}
      }

      // TODO Move KeyRenameAndPickMap here
      immerState.activities[from][activityItem.hash] = activityItem
    },
  },
})

export type Events = {
  activityEncountered: AnyEVMTransaction
}

export const emitter = new Emittery<Events>()

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
