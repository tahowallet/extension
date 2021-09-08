import { createSlice } from "@reduxjs/toolkit"

export const initialState = {
  showingActivityDetail: false,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setShowingActivityDetail: (state, { payload: activityItem }) => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
  },
})

export const { setShowingActivityDetail } = uiSlice.actions
export default uiSlice.reducer
