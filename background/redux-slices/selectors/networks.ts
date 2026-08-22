import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { isBuiltInNetwork, TEST_NETWORK_BY_CHAIN_ID } from "../../constants"
import { EVMNetwork } from "../../networks"
import { selectCurrentNetwork } from "./uiSelectors"

// Adds chainID to each NFT for convenience in frontend
// eslint-disable-next-line import/prefer-default-export
export const selectEVMNetworks = createSelector(
  (state: RootState) => state.networks.evmNetworks,
  (evmNetworks): EVMNetwork[] => Object.values(evmNetworks),
)

export const selectProductionEVMNetworks = createSelector(
  selectEVMNetworks,
  (evmNetworks) =>
    evmNetworks.filter(
      (network) => !TEST_NETWORK_BY_CHAIN_ID.has(network.chainID),
    ),
)

export const selectCustomNetworks = createSelector(
  selectEVMNetworks,
  (evmNetworks) => evmNetworks.filter((network) => !isBuiltInNetwork(network)),
)

export const selectTestnetNetworks = createSelector(
  selectEVMNetworks,
  (evmNetworks) =>
    evmNetworks.filter((network) =>
      TEST_NETWORK_BY_CHAIN_ID.has(network.chainID),
    ),
)

/**
 * The chains whose RPC endpoints cannot currently be reached, keyed by chain
 * ID.
 *
 * Deliberately a whole-map selector rather than a per-chain one. The network
 * list renders a row per chain and each row needs this answer; a selector
 * taking a chain ID would be a fresh closure per row per render, which
 * defeats the memoization every other selector here relies on and makes every
 * row recompute on every block. Read the map once at the list level and pass
 * each row its own answer.
 */
export const selectUnreachableNetworks = (
  state: RootState,
): { [chainID: string]: boolean } => state.networks.unreachableNetworks

export const selectIsCurrentNetworkUnreachable = createSelector(
  selectCurrentNetwork,
  selectUnreachableNetworks,
  (currentNetwork, unreachableNetworks) =>
    unreachableNetworks[currentNetwork.chainID] === true,
)
