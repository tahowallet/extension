import { createSlice } from "@reduxjs/toolkit"
import { BaseAsset } from "../services/custom-networks/db"

type CustomNetworksState = {
  baseAssets: BaseAsset[]
}

export const initialState: CustomNetworksState = {
  baseAssets: [],
}

const customNetworksSlice = createSlice({
  name: "customNetworks",
  initialState,
  reducers: {
    updateBaseAssets: (
      immerState,
      { payload: assets }: { payload: BaseAsset[] }
    ) => {
      immerState.baseAssets = assets
    },
  },
})

export const { updateBaseAssets } = customNetworksSlice.actions

export default customNetworksSlice.reducer
