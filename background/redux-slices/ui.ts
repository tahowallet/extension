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
  selectedAccount: string
}

export const initialState: UIState = {
  showingActivityDetail: null,
  selectedAccount: "",
}
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setShowingActivityDetail: (state, { payload: activityItem }) => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
    setSelectedAccount: (immerState, { payload: address }) => {
      immerState.selectedAccount = address
    },
  },
})

export const { setShowingActivityDetail, setSelectedAccount } = uiSlice.actions
export default uiSlice.reducer
