import { createSlice, createSelector } from "@reduxjs/toolkit"
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
  settings: {
    mainCurrency: string
    hideDust: boolean
  }
}

export const initialState: UIState = {
  showingActivityDetail: null,
  initializationLoadingTimeExpired: false,
  settings: {
    mainCurrency: "USD",
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
      { payload: activityItem }: { payload: ActivityItem | null }
    ): UIState => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
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

export const selectMainCurrency = createSelector(
  selectSettings,
  (settings) => settings.mainCurrency
)
