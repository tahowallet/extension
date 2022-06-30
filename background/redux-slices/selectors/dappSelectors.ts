import { createSelector } from "@reduxjs/toolkit"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
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
  (allowed, currentAccount): PermissionRequest[] => {
    // Return an array of all permissions corresponding to
    // the currently selected account
    const permissions: PermissionRequest[] = []

    Object.keys(allowed.evm).forEach((chainId) => {
      Object.keys(allowed.evm[chainId]).forEach((address) => {
        if (address === currentAccount.address) {
          Object.values(allowed.evm[chainId][address]).forEach((permission) => {
            permissions.push(permission)
          })
        }
      })
    })
    return permissions
  }
)
