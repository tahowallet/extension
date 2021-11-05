import { createSlice, createSelector } from "@reduxjs/toolkit"
import { ActivityItem } from "../types"

export type UIState = {
  showingActivityDetail: ActivityItem | null
  settings: {
    hideDust: boolean
  }
}

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

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState
)

export const selectSettings = createSelector(selectUI, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings.hideDust
)
