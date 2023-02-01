import { createSlice } from "@reduxjs/toolkit"
import { EIP1559Block, AnyEVMBlock, EVMNetwork } from "../networks"

type NetworkState = {
  blockHeight: number | null
  baseFeePerGas: bigint | null
}

export type NetworksState = {
  evmNetworks: {
    [chainID: string]: EVMNetwork
  }
  blockInfo: {
    [chainID: string]: NetworkState
  }
}

export const initialState: NetworksState = {
  evmNetworks: {},
  blockInfo: {
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

      if (!(block.network.chainID in immerState.blockInfo)) {
        immerState.blockInfo[block.network.chainID] = {
          blockHeight: block.blockHeight,
          baseFeePerGas: block?.baseFeePerGas ?? null,
        }
      } else if (
        block.blockHeight >
        (immerState.blockInfo[block.network.chainID].blockHeight || 0)
      ) {
        immerState.blockInfo[block.network.chainID].blockHeight =
          block.blockHeight
        immerState.blockInfo[block.network.chainID].baseFeePerGas =
          block?.baseFeePerGas ?? null
      }
    },
    setEVMNetworks: (immerState, { payload }: { payload: EVMNetwork[] }) => {
      payload.forEach((network) => {
        immerState.evmNetworks[network.chainID] = network
      })
    },
  },
})

export const { blockSeen, setEVMNetworks } = networksSlice.actions

export default networksSlice.reducer
