import { createSlice } from "@reduxjs/toolkit"

export const initialState = {
  showingActivityDetail: undefined,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setShowingActivityDetail: (state, { payload: activityId }) => ({
      ...state,
      showingActivityDetail: activityId,
    }),
  },
})

export const { setShowingActivityDetail } = uiSlice.actions
export const uiSelector = (state) => state.ui
export default uiSlice.reducer
