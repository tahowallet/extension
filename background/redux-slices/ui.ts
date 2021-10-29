import { createSlice } from "@reduxjs/toolkit"
import { AnyEVMTransaction } from "../types"

export type ActivityItem = AnyEVMTransaction & {
  timestamp?: string
  value: bigint
  from?: string
  isSent?: boolean
}

export type UIState = {
  showingActivityDetail: ActivityItem | null
  initializationLoadingTimeExpired: boolean
}

export const initialState: UIState = {
  showingActivityDetail: null,
  initializationLoadingTimeExpired: false,
}
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setShowingActivityDetail: (
      state,
      { payload: activityItem }: { payload: ActivityItem | null }
    ): UIState => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
    initializationLoadingTimeHitLimit: (immerState) => {
      immerState.initializationLoadingTimeExpired = true
    },
  },
})

export const { setShowingActivityDetail, initializationLoadingTimeHitLimit } =
  uiSlice.actions
export default uiSlice.reducer
