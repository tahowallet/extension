import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { DAppPermissionState } from "../dapp-permission"
import { selectCurrentAccount } from "./uiSelectors"

export const getProviderBridgeState = (state: RootState): DAppPermissionState =>
  state.dappPermission

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
  getProviderBridgeState,
  selectCurrentAccount,
  (slice, currentAccount) =>
    Object.fromEntries(
      Object.entries(slice.allowedPages).filter(
        ([_, { accountAddress }]) =>
          accountAddress.toLowerCase() === currentAccount.address.toLowerCase()
      )
    )
)
