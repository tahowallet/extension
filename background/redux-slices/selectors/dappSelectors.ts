import { createSelector } from "@reduxjs/toolkit"
import { Permission } from "@tallyho/provider-bridge-shared"
import { RootState } from ".."
import { DAppPermissionState } from "../dapp"
import { selectCurrentAccount } from "./uiSelectors"
import { sameEVMAddress } from "../../lib/utils"

export const getProviderBridgeState = (state: RootState): DAppPermissionState =>
  state.dapp

export const selectPermissionRequests = createSelector(
  getProviderBridgeState,
  (slice: DAppPermissionState) => Object.values(slice.permissionRequests),
)

export const selectUnansweredPermissionRequests = createSelector(
  selectPermissionRequests,
  (permissionRequests) =>
    permissionRequests.filter((p) => p.state === "request"),
)

export const selectCurrentUnansweredPermissionRequest = createSelector(
  selectUnansweredPermissionRequests,
  (permissionRequests) =>
    permissionRequests.length > 0 ? permissionRequests[0] : undefined,
)

export const selectAllowedPages = createSelector(
  (state: RootState) => getProviderBridgeState(state).allowed,
  selectCurrentAccount,
  (allowed, currentAccount): Permission[] => {
    // Return an array of all permissions corresponding to
    // the currently selected account
    const permissions: Permission[] = []

    Object.keys(allowed.evm).forEach((chainId) => {
      Object.keys(allowed.evm[chainId]).forEach((address) => {
        if (sameEVMAddress(address, currentAccount.address)) {
          Object.values(allowed.evm[chainId][address]).forEach((permission) => {
            permissions.push(permission)
          })
        }
      })
    })
    return permissions
  },
)
