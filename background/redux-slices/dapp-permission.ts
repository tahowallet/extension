import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { createBackgroundAsyncThunk } from "./utils"

export type DAppPermissionState = {
  permissionRequests: { [url: string]: PermissionRequest }
}

export const initialState: DAppPermissionState = {
  permissionRequests: {},
  // TODO: initialize allowed sites
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
    requestPermission: (
      state,
      { payload: request }: { payload: PermissionRequest }
    ) => {
      if (state.permissionRequests[request.url]?.state !== "allow") {
        return {
          ...state,
          permissionRequests: {
            ...state.permissionRequests,
            [request.url]: { ...request },
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
          delete updatedPermissionRequests[permission.url]

          // TODO: add the site to allowedsites later

          return {
            permissionRequests: { ...updatedPermissionRequests },
          }
        }
      )
      .addCase(
        denyOrRevokePermission.fulfilled,
        (state, { payload: permission }: { payload: PermissionRequest }) => {
          const updatedPermissionRequests = { ...state.permissionRequests }
          delete updatedPermissionRequests[permission.url]

          // TODO: remove the site from allowedsites later

          return {
            ...state,
            permissionRequests: { ...updatedPermissionRequests },
          }
        }
      )
  },
})

export const { requestPermission } = dappPermissionSlice.actions

export default dappPermissionSlice.reducer
