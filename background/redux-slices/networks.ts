import { createSlice } from "@reduxjs/toolkit"
import type { RootState } from "."
import { ETHEREUM } from "../constants"
import { EIP1559Block, AnyEVMBlock, EVMNetwork, RpcEndpoint } from "../networks"
import {
  RpcEndpointValidationError,
  RpcEndpointValidationFailure,
} from "../services/chain/errors"
import { NetworkReachabilityState } from "../services/chain/network-reachability"
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
  /**
   * The chains whose configured RPC endpoints cannot currently be reached,
   * keyed by chain ID. A chain is absent until it has been heard from, so a
   * network nobody has tried to reach is treated as fine rather than broken.
   */
  unreachableNetworks: {
    [chainID: string]: boolean
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
  unreachableNetworks: {},
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
     * Records whether a chain's RPC endpoints can be reached. The background
     * only reports transitions, so this arrives rarely; a chain that recovers
     * drops out of the map rather than being recorded as reachable, keeping
     * "reachable" and "never heard from" the same thing for every reader.
     */
    networkReachabilityChanged: (
      immerState,
      {
        payload: { chainID, status },
      }: { payload: { chainID: string; status: NetworkReachabilityState } },
    ) => {
      if (status === "unreachable") {
        immerState.unreachableNetworks[chainID] = true
      } else {
        delete immerState.unreachableNetworks[chainID]
      }
    },
    /**
     * Forgets every recorded outage.
     *
     * Dispatched once at startup, because this map is persisted while the
     * trackers that fill it are not: they live and die with the service worker
     * and report only transitions, so a chain recorded unreachable in a past
     * lifetime would have nothing left alive to contradict it.
     */
    networkReachabilityReset: (immerState) => {
      immerState.unreachableNetworks = {}
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
          delete immerState.unreachableNetworks[chainID]
        }
      })
    },
  },
})

export const {
  blockSeen,
  networkReachabilityChanged,
  networkReachabilityReset,
  setEVMNetworks,
} = networksSlice.actions

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

/**
 * Why a settings save was rejected, in a form the UI can put into its own
 * words. Endpoint probe failures carry their discriminant through from the
 * background so they can be localized; anything else arrives as prose we can
 * only pass along, which is at least better than nothing to report.
 */
export type ChainConfigUpdateError =
  | RpcEndpointValidationFailure
  | { kind: "unknown"; message: string }

export type ChainConfigUpdateResult =
  | { success: true }
  | { success: false; error: ChainConfigUpdateError }

const toUpdateError = (error: unknown): ChainConfigUpdateError => {
  if (error instanceof RpcEndpointValidationError) {
    return error.failure
  }

  return {
    kind: "unknown",
    message: error instanceof Error ? error.message : String(error),
  }
}

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
      return { success: false, error: toUpdateError(error) }
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
