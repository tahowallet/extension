import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "."
import { ETHEREUM } from "../constants"
import { EIP1559Block, AnyEVMBlock, EVMNetwork, RpcEndpoint } from "../networks"
import { removeChainBalances } from "./accounts"
import { selectCurrentNetwork } from "./selectors/uiSelectors"
import { setSelectedNetwork } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"

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
      { payload: blockPayload }: { payload: AnyEVMBlock },
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
    /**
     * Receives all supported networks as the payload
     */
    setEVMNetworks: (immerState, { payload }: { payload: EVMNetwork[] }) => {
      const chainIds = payload.map((network) => network.chainID)

      payload.forEach((network) => {
        immerState.evmNetworks[network.chainID] = network
      })

      // Remove payload missing networks from state
      Object.keys(immerState.evmNetworks).forEach((chainID) => {
        if (!chainIds.includes(chainID)) {
          delete immerState.evmNetworks[chainID]
          delete immerState.blockInfo[chainID]
        }
      })
    },
  },
})

export const { blockSeen, setEVMNetworks } = networksSlice.actions

export default networksSlice.reducer

export const removeCustomChain = createBackgroundAsyncThunk(
  "networks/removeCustomChain",
  async (chainID: string, { getState, dispatch, extra: { main } }) => {
    const store = getState() as RootState
    const currentNetwork = selectCurrentNetwork(store)

    if (currentNetwork.chainID === chainID) {
      await dispatch(setSelectedNetwork(ETHEREUM))
    }
    await dispatch(removeChainBalances(chainID))

    return main.removeEVMNetwork(chainID)
  },
)

export type ChainConfigUpdateResult =
  | { success: true }
  | { success: false; error: string }

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export type NetworkSettingsUpdate = {
  chainID: string
  rpcEndpoints: RpcEndpoint[]
  blockExplorerUrl: string
  /**
   * Identifying metadata, editable only for custom networks; the background
   * rejects it for built-in chains.
   */
  metadata?: {
    chainName: string
    assetName: string
    symbol: string
    decimals: number
    iconUrl?: string
  }
}

/**
 * Updates the user-editable settings for any known network — built-in or
 * custom. The chain ID and family are immutable, and identifying metadata
 * is only editable for custom networks. New endpoints are probed for
 * reachability and chain ID agreement before being saved; failures are
 * reported via the returned result rather than thrown.
 */
export const updateNetworkSettings = createBackgroundAsyncThunk(
  "networks/updateNetworkSettings",
  async (
    {
      chainID,
      rpcEndpoints,
      blockExplorerUrl,
      metadata,
    }: NetworkSettingsUpdate,
    { getState, dispatch, extra: { main } },
  ): Promise<ChainConfigUpdateResult> => {
    try {
      const updatedNetwork = await main.updateNetworkSettings(
        chainID,
        rpcEndpoints,
        blockExplorerUrl,
        metadata,
      )

      const store = getState() as RootState
      const currentNetwork = selectCurrentNetwork(store)

      if (currentNetwork.chainID === chainID) {
        // Refresh the selected network so its details reflect the edit.
        await dispatch(setSelectedNetwork(updatedNetwork))
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: toErrorMessage(error) }
    }
  },
)

/**
 * Resolves to the given chain's current user-editable RPC endpoints (in
 * priority order) along with any Taho-managed endpoints that serve the chain
 * but are not user-editable.
 */
export const getChainRpcConfig = createBackgroundAsyncThunk(
  "networks/getChainRpcConfig",
  async (chainID: string, { extra: { main } }) =>
    main.getRpcConfigForChain(chainID),
)
