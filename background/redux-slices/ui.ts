import { createSlice, createSelector } from "@reduxjs/toolkit"
import { AnyEVMTransaction } from "../types"

type SelectedAccount = {
  address: string
  truncatedAddress: string
}

export type UIState = {
  selectedAccount: SelectedAccount
  showingActivityDetail: string | null
  initializationLoadingTimeExpired: boolean
  settings: {
    hideDust: boolean
  }
}

export const initialState: UIState = {
  showingActivityDetail: null,
  selectedAccount: { address: "", truncatedAddress: "" },
  initializationLoadingTimeExpired: false,
  settings: {
    hideDust: false,
  },
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (immerState, { payload: shouldHideDust }) => {
      immerState.settings.hideDust = shouldHideDust
    },
    setShowingActivityDetail: (
      state,
      { payload: activityItemHash }: { payload: string | null }
    ): UIState => ({
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
    initializationLoadingTimeHitLimit: (state) => ({
      ...state,
      initializationLoadingTimeExpired: true,
    }),
  },
})

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleHideDust,
  setSelectedAccount,
} = uiSlice.actions

export default uiSlice.reducer

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState
)

export const selectSettings = createSelector(selectUI, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings.hideDust
)
