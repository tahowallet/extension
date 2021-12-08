import { createSlice, createSelector } from "@reduxjs/toolkit"
import { ActivityItem } from "./activities"

type SelectedAccount = {
  address: string
  truncatedAddress: string
}

export type UIState = {
  currentAccount: SelectedAccount
  showingActivityDetail: ActivityItem | null
  initializationLoadingTimeExpired: boolean
  settings: undefined | { hideDust: boolean | undefined }
}

export const initialState: UIState = {
  showingActivityDetail: null,
  currentAccount: { address: "", truncatedAddress: "" },
  initializationLoadingTimeExpired: false,
  settings: {
    hideDust: false,
  },
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (
      immerState,
      { payload: shouldHideDust }: { payload: boolean | undefined }
    ): void => {
      immerState.settings = {
        hideDust: shouldHideDust,
      }
    },
    setShowingActivityDetail: (
      state,
      { payload: activityItem }: { payload: ActivityItem | null }
    ): UIState => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
    setCurrentAccount: (immerState, { payload: address }) => {
      const lowercaseAddress = address.toLowerCase()

      immerState.currentAccount = {
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
  setCurrentAccount,
} = uiSlice.actions

export default uiSlice.reducer

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState
)

export const selectSettings = createSelector(selectUI, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings?.hideDust
)
