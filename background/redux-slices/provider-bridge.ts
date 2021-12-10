import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { createBackgroundAsyncThunk } from "./utils"

export type ProviderBridgeState = {
  permissionRequests: { [url: string]: PermissionRequest }
}

export const initialState: ProviderBridgeState = {
  permissionRequests: {},
  // TODO: initialize allowed sites
}

export type Events = {
  permissionRequest: PermissionRequest
  permissionGranted: PermissionRequest
  permissionDenied: PermissionRequest
}

export const emitter = new Emittery<Events>()

// Async thunk to bubble the permissionGrant action from  store to emitter.
export const permissionGrant = createBackgroundAsyncThunk(
  "provider-bridge/permissionGrant",
  async (permission: PermissionRequest) => {
    await emitter.emit("permissionGranted", permission)
    return permission
  }
)

// Async thunk to bubble the permissionDenyOrRevoke action from  store to emitter.
export const permissionDenyOrRevoke = createBackgroundAsyncThunk(
  "provider-bridge/permissionDenyOrRevoke",
  async (permission: PermissionRequest) => {
    await emitter.emit("permissionDenied", permission)
    return permission
  }
)

const providerBridgeSlice = createSlice({
  name: "provider-bridge",
  initialState,
  reducers: {
    newPermissionRequest: (
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
        permissionGrant.fulfilled,
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
        permissionDenyOrRevoke.fulfilled,
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

export const { newPermissionRequest } = providerBridgeSlice.actions

export default providerBridgeSlice.reducer
