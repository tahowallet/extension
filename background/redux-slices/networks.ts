import { createSlice } from "@reduxjs/toolkit"

import { AnyEVMBlock } from "../networks"

type NetworkState = {
  blocks: { [blockHeight: number]: AnyEVMBlock }
  blockHeight: number | null
}

export type NetworksState = {
  evm: {
    [chainID: string]: NetworkState
  }
}

export const initialState: NetworksState = {
  evm: {
    "1": {
      blockHeight: null,
      blocks: {},
    },
  },
}

const networksSlice = createSlice({
  name: "networks",
  initialState,
  reducers: {
    blockSeen: (immerState, { payload: block }: { payload: AnyEVMBlock }) => {
      if (!(block.network.chainID in immerState.evm)) {
        immerState.evm[block.network.chainID] = {
          blocks: {},
          blockHeight: block.blockHeight,
        }
      } else if (
        block.blockHeight >
        (immerState.evm[block.network.chainID].blockHeight || 0)
      ) {
        immerState.evm[block.network.chainID].blockHeight = block.blockHeight
      }
      immerState.evm[block.network.chainID].blocks[block.blockHeight] = block
    },
  },
})

export const { blockSeen } = networksSlice.actions

export default networksSlice.reducer
