import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { KeyringTypes } from "../types"

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
}

export const initialState: KeyringsState = {
  keyrings: [],
}

const keyringsSlice = createSlice({
  name: "keyrings",
  initialState,
  reducers: {
    updateKeyrings: (state, { payload: keyrings }: { payload: Keyring[] }) => {
      return {
        keyrings,
      }
    },
  },
})

export const { updateKeyrings } = keyringsSlice.actions

export default keyringsSlice.reducer

export type Events = {
  generateNewKeyring: never
  importLegacyKeyring: { mnemonic: string }
}

export const emitter = new Emittery<Events>()

// Async thunk to bubble the generateNewKeyring action from  store to emitter.
export const generateNewKeyring = createAsyncThunk<Promise<void>, void>(
  "keyrings/generateNewKeyring",
  async () => {
    await emitter.emit("generateNewKeyring")
  }
)

// Async thunk to bubble the importLegacyKeyring action from  store to emitter.
export const importLegacyKeyring = createAsyncThunk<
  Promise<void>,
  { mnemonic: string }
>("keyrings/importLegacyKeyring", async ({ mnemonic }) => {
  await emitter.emit("importLegacyKeyring", { mnemonic })
})
