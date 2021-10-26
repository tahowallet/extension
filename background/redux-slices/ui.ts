import { createSlice } from "@reduxjs/toolkit"
import { AnyEVMTransaction } from "../types"

export type UIState = {
  showingActivityDetail: string
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
    setShowingActivityDetail: (state, { payload: activityItemHash }) => ({
      ...state,
      showingActivityDetail: activityItemHash,
    }),
    setSelectedAccount: (immerState, { payload: address }) => {
      immerState.selectedAccount = address.toLowerCase()
    },
  },
})

export const { setShowingActivityDetail, setSelectedAccount } = uiSlice.actions
export default uiSlice.reducer
