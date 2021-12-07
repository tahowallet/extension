import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { createBackgroundAsyncThunk } from "./utils"

export type PermissionRequest = {
  url: string
  favIconUrl: string
  state: "request" | "allow" | "deny"
}

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

// Async thunk to bubble the permissionGranted action from  store to emitter.
export const permissionGranted = createBackgroundAsyncThunk(
  "provider-bridge/grantPermission",
  async (permission: PermissionRequest) => {
    await emitter.emit("permissionGranted", permission)
    return permission
  }
)

// Async thunk to bubble the permissionDenied action from  store to emitter.
export const permissionDenied = createBackgroundAsyncThunk(
  "provider-bridge/denyPermission",
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
        permissionGranted.fulfilled,
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
        permissionDenied.fulfilled,
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
