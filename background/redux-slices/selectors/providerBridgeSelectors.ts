import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { ProviderBridgeState } from "../provider-bridge"

export const getProviderBridgeState = (state: RootState) => state.providerBridge

export const selectPermissionRequests = createSelector(
  getProviderBridgeState,
  (slice: ProviderBridgeState) => Object.values(slice.permissionRequests)
)

export const selectPendingPermissionRequests = createSelector(
  selectPermissionRequests,
  (permissionRequests) => {
    return permissionRequests.filter((p) => p.state === "request")
  }
)
