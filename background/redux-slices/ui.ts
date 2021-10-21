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
}

export const initialState: UIState = {
  showingActivityDetail: null,
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
  },
})

export const { setShowingActivityDetail } = uiSlice.actions
export default uiSlice.reducer
