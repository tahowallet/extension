import { createSlice } from "@reduxjs/toolkit"
import { EIP1559Block, AnyEVMBlock } from "../networks"

type NetworkState = {
  blockHeight: number | null
  baseFeePerGas: bigint | null
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
      baseFeePerGas: null,
    },
  },
}

const networksSlice = createSlice({
  name: "networks",
  initialState,
  reducers: {
    blockSeen: (
      immerState,
      { payload: blockPayload }: { payload: AnyEVMBlock }
    ) => {
      const block = blockPayload as EIP1559Block

      if (!(block.network.chainID in immerState.evm)) {
        immerState.evm[block.network.chainID] = {
          blockHeight: block.blockHeight,
          baseFeePerGas: block?.baseFeePerGas ?? null,
        }
      } else if (
        block.blockHeight >
        (immerState.evm[block.network.chainID].blockHeight || 0)
      ) {
        immerState.evm[block.network.chainID].blockHeight = block.blockHeight
        immerState.evm[block.network.chainID].baseFeePerGas =
          block?.baseFeePerGas ?? null
      }
    },
  },
})

export const { blockSeen } = networksSlice.actions

export default networksSlice.reducer
