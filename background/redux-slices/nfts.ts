import { createSlice } from "@reduxjs/toolkit"
import { createBackgroundAsyncThunk } from "./utils"
import { EVMNetwork } from "../networks"

export type NFTItem = {
  media: { gateway?: string }[]
  title: string
}

export type NFTsState = {
  evm: {
    [chainID: string]: {
      [address: string]: NFTItem[]
    }
  }
}

export const initialState = {
  evm: {},
} as NFTsState

const NFTsSlice = createSlice({
  name: "nfts",
  initialState,
  reducers: {
    updateNFTs: (immerState, { payload: { address, NFTs, network } }) => {
      const normalizedAddress = address
      immerState.evm[network.chainID] ??= {}
      immerState.evm[network.chainID][normalizedAddress] ??= []
      immerState.evm[network.chainID][normalizedAddress] = NFTs
    },
  },
})

export const { updateNFTs } = NFTsSlice.actions

export default NFTsSlice.reducer
