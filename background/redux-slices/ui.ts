import { createSlice } from "@reduxjs/toolkit"
import { ActivityItem } from "./activities"
import { AnyEVMTransaction } from "../types"

type SelectedAccount = {
  address: string
  truncatedAddress: string
}

export type UIState = {
  selectedAccount: SelectedAccount
  showingActivityDetail: ActivityItem | null
  initializationLoadingTimeExpired: boolean
}

export const initialState: UIState = {
  showingActivityDetail: null,
  selectedAccount: { address: "", truncatedAddress: "" },
  initializationLoadingTimeExpired: false,
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
      const lowercaseAddress = address.toLowerCase()

      immerState.selectedAccount = {
        address: lowercaseAddress,
        truncatedAddress: lowercaseAddress.slice(0, 7),
      }
    },
    initializationLoadingTimeHitLimit: (immerState) => {
      immerState.initializationLoadingTimeExpired = true
    },
  },
})

export const {
  setShowingActivityDetail,
  setSelectedAccount,
  initializationLoadingTimeHitLimit,
} = uiSlice.actions

export default uiSlice.reducer
