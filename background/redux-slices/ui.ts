import { createSlice, createSelector } from "@reduxjs/toolkit"
import {
  AccountState,
  ActivityItem,
  AnyEVMTransaction,
  UIState,
} from "../types"

export const initialState: UIState = {
  showingActivityDetail: null,
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
      { payload: activityItem }: { payload: ActivityItem | null }
    ): UIState => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
  },
})

export const { setShowingActivityDetail, toggleHideDust } = uiSlice.actions
export default uiSlice.reducer

export const selectUi = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState
)

export const selectSettings = createSelector(selectUi, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings.hideDust
)
