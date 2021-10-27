import { createSlice } from "@reduxjs/toolkit"
import { AnyEVMTransaction } from "../types"

type SelectedAccount = {
  address: string
  truncatedAddress: string
}

export type UIState = {
  showingActivityDetail: string | null
  selectedAccount: SelectedAccount
}

export const initialState: UIState = {
  showingActivityDetail: null,
  selectedAccount: { address: "", truncatedAddress: "" },
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
  },
})

export const { setShowingActivityDetail, setSelectedAccount } = uiSlice.actions
export default uiSlice.reducer
