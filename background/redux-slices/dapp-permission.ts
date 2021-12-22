import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { createBackgroundAsyncThunk } from "./utils"

export type DAppPermissionState = {
  permissionRequests: { [url: string]: PermissionRequest }
  allowedPages: { [origin_accountAddress: string]: PermissionRequest }
}

export const initialState: DAppPermissionState = {
  permissionRequests: {},
  allowedPages: {},
}

export type Events = {
  requestPermission: PermissionRequest
  grantPermission: PermissionRequest
  denyOrRevokePermission: PermissionRequest
}

export const emitter = new Emittery<Events>()

// Async thunk to bubble the permissionGrant action from  store to emitter.
export const grantPermission = createBackgroundAsyncThunk(
  "dapp-permission/permissionGrant",
  async (permission: PermissionRequest) => {
    await emitter.emit("grantPermission", permission)
    return permission
  }
)

// Async thunk to bubble the permissionDenyOrRevoke action from  store to emitter.
export const denyOrRevokePermission = createBackgroundAsyncThunk(
  "dapp-permissionpermissionDenyOrRevoke",
  async (permission: PermissionRequest) => {
    await emitter.emit("denyOrRevokePermission", permission)
    return permission
  }
)

const dappPermissionSlice = createSlice({
  name: "dapp-permission",
  initialState,
  reducers: {
    initializeAllowedPages: (
      state,
      { payload: allowedPages }: { payload: Record<string, PermissionRequest> }
    ) => {
      return {
        ...state,
        allowedPages: { ...allowedPages },
      }
    },
    requestPermission: (
      state,
      { payload: request }: { payload: PermissionRequest }
    ) => {
      if (state.permissionRequests[request.key]?.state !== "allow") {
        return {
          ...state,
          permissionRequests: {
            // Quick fix: store only the latest permission request.
            // TODO: put this back when we fixed the performance issues and/or updated our UI to handle multiple requests
            // ...state.permissionRequests,
            [request.key]: { ...request },
          },
        }
      }

      return state
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        grantPermission.fulfilled,
        (state, { payload: permission }: { payload: PermissionRequest }) => {
          const updatedPermissionRequests = { ...state.permissionRequests }
          delete updatedPermissionRequests[permission.key]

          return {
            permissionRequests: updatedPermissionRequests,
            allowedPages: {
              ...state.allowedPages,
              [permission.key]: permission,
            },
          }
        }
      )
      .addCase(
        denyOrRevokePermission.fulfilled,
        (state, { payload: permission }: { payload: PermissionRequest }) => {
          const updatedPermissionRequests = { ...state.permissionRequests }
          delete updatedPermissionRequests[permission.key]

          // remove page from the allowedPages list
          const updatedAllowedPages = { ...state.allowedPages }
          delete updatedAllowedPages[permission.key]

          return {
            permissionRequests: updatedPermissionRequests,
            allowedPages: updatedAllowedPages,
          }
        }
      )
  },
})

export const { requestPermission, initializeAllowedPages } =
  dappPermissionSlice.actions

export default dappPermissionSlice.reducer
