import { createSlice } from "@reduxjs/toolkit"

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

export const initialState = {
  keyrings: [],
} as KeyringsState

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
