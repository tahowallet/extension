import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { KeyringTypes } from "../types"
import { createBackgroundAsyncThunk } from "./utils"

// TODO this is very simple. We'll want to expand to include "capabilities" per
// keyring, including whether they can add new accounts, whether they can sign
// transactions, messages, typed data, etc. Including those explicitly means the
// type string (and frontend) can do way less work.
type Keyring = {
  type: KeyringTypes
  addresses: string[]
}

type KeyringsState = {
  keyrings: Keyring[]
  importing: false | "pending" | "done"
}

export const initialState: KeyringsState = {
  keyrings: [],
  importing: false,
}

export type Events = {
  generateNewKeyring: never
  importLegacyKeyring: { mnemonic: string }
}

export const emitter = new Emittery<Events>()

// Async thunk to bubble the importLegacyKeyring action from  store to emitter.
export const importLegacyKeyring = createBackgroundAsyncThunk(
  "keyrings/importLegacyKeyring",
  async ({ mnemonic }: { mnemonic: string }) => {
    await emitter.emit("importLegacyKeyring", { mnemonic })
  }
)

const keyringsSlice = createSlice({
  name: "keyrings",
  initialState,
  reducers: {
    updateKeyrings: (state, { payload: keyrings }: { payload: Keyring[] }) => ({
      ...state,
      keyrings,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(importLegacyKeyring.pending, (state) => {
        return {
          ...state,
          importing: "pending",
        }
      })
      .addCase(importLegacyKeyring.fulfilled, (state) => {
        return {
          ...state,
          importing: "done",
        }
      })
  },
})

export const { updateKeyrings } = keyringsSlice.actions

export default keyringsSlice.reducer

// Async thunk to bubble the generateNewKeyring action from  store to emitter.
export const generateNewKeyring = createBackgroundAsyncThunk(
  "keyrings/generateNewKeyring",
  async () => {
    await emitter.emit("generateNewKeyring")
  }
)
