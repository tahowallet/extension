import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { DAppPermissionState } from "../dapp"
import { selectCurrentAccount } from "./uiSelectors"

export const getProviderBridgeState = (state: RootState): DAppPermissionState =>
  state.dapp

export const selectPermissionRequests = createSelector(
  getProviderBridgeState,
  (slice: DAppPermissionState) => Object.values(slice.permissionRequests)
)

export const selectPendingPermissionRequests = createSelector(
  selectPermissionRequests,
  (permissionRequests) => {
    return permissionRequests.filter((p) => p.state === "request")
  }
)

export const selectCurrentPendingPermission = createSelector(
  selectPendingPermissionRequests,
  (permissionRequests) => {
    return permissionRequests.length > 0 ? permissionRequests[0] : undefined
  }
)

export const selectAllowedPages = createSelector(
  (state: RootState) => getProviderBridgeState(state).allowed,
  selectCurrentAccount,
  (allowedPages, currentAccount) =>
    // Decompose the origin -> permission mapping and leave only the origin ->
    // permissions that reference the current account address and network.
    // EVM only for now
    allowedPages.evm[currentAccount.network.chainID]?.[currentAccount.address]
)
