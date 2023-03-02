import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { setNewSelectedAccount, UIState } from "./ui"
import { createBackgroundAsyncThunk } from "./utils"
import { Keyring, SignerMetadata, WalletData } from "../services/keyring/index"

type KeyringToVerify = {
  id: string
  mnemonic: string[]
} | null

export type KeyringsState = {
  wallets: WalletData[]
  keyrings: Keyring[]
  metadata: {
    [keyringId: string]: SignerMetadata
  }
  importing: false | "pending" | "done"
  status: "locked" | "unlocked" | "uninitialized"
  keyringToVerify: KeyringToVerify
}

export const initialState: KeyringsState = {
  keyrings: [],
  wallets: [],
  metadata: {},
  importing: false,
  status: "uninitialized",
  keyringToVerify: null,
}

export type Events = {
  createPassword: string
  unlockKeyrings: string
  lockKeyrings: never
  generateNewKeyring: string | undefined
  deriveAddress: string
  importKeyring: ImportKeyring
  importPrivateKey: string
}

export const emitter = new Emittery<Events>()

interface ImportKeyring {
  mnemonic: string
  source: "internal" | "import"
  path?: string
}

// Async thunk to bubble the importKeyring action from  store to emitter.
export const importKeyring = createBackgroundAsyncThunk(
  "keyrings/importKeyring",
  async ({ mnemonic, source, path }: ImportKeyring, { getState, dispatch }) => {
    await emitter.emit("importKeyring", { mnemonic, path, source })

    const { keyrings, ui } = getState() as {
      keyrings: KeyringsState
      ui: UIState
    }
    // Set the selected account as the first address of the last added keyring,
    // which will correspond to the last imported keyring, AKA this one. Note that
    // this does rely on the KeyringService's behavior of pushing new keyrings to
    // the end of the keyring list.
    dispatch(
      setNewSelectedAccount({
        address: keyrings.keyrings.slice(-1)[0].addresses[0],
        network: ui.selectedAccount.network,
      })
    )
  }
)

export const importPrivateKey = createBackgroundAsyncThunk(
  "keyrings/importPrivateKey",
  async (privateKey: string, { getState, dispatch }) => {
    await emitter.emit("importPrivateKey", privateKey)

    const { keyrings, ui } = getState() as {
      keyrings: KeyringsState
      ui: UIState
    }

    dispatch(
      setNewSelectedAccount({
        address: keyrings.wallets.slice(-1)[0].addresses[0],
        network: ui.selectedAccount.network,
      })
    )
  }
)

const keyringsSlice = createSlice({
  name: "keyrings",
  initialState,
  reducers: {
    keyringLocked: (state) => ({ ...state, status: "locked" }),
    keyringUnlocked: (state) => ({ ...state, status: "unlocked" }),
    updateKeyrings: (
      state,
      {
        payload: { wallets, keyrings, metadata },
      }: {
        payload: {
          wallets: WalletData[]
          keyrings: Keyring[]
          metadata: { [keyringId: string]: SignerMetadata }
        }
      }
    ) => {
      // When the keyrings are locked, we receive updateKeyrings with an empty
      // list as the keyring service clears the in-memory keyrings. For UI
      // purposes, however, we want to continue tracking the keyring metadata,
      // so we ignore an empty list if the keyrings are locked.
      if (state.status === "locked") {
        return state
      }

      return {
        ...state,
        wallets,
        keyrings,
        metadata,
      }
    },
    setKeyringToVerify: (state, { payload }: { payload: KeyringToVerify }) => ({
      ...state,
      keyringToVerify: payload,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(importKeyring.pending, (state) => {
        return {
          ...state,
          importing: "pending",
        }
      })
      .addCase(importKeyring.fulfilled, (state) => {
        return {
          ...state,
          importing: "done",
          keyringToVerify: null,
        }
      })
  },
})

export const {
  updateKeyrings,
  keyringLocked,
  keyringUnlocked,
  setKeyringToVerify,
} = keyringsSlice.actions

export default keyringsSlice.reducer

// Async thunk to bubble the generateNewKeyring action from  store to emitter.
export const generateNewKeyring = createBackgroundAsyncThunk(
  "keyrings/generateNewKeyring",
  async (path?: string) => {
    await emitter.emit("generateNewKeyring", path)
  }
)

export const deriveAddress = createBackgroundAsyncThunk(
  "keyrings/deriveAddress",
  async (id: string) => {
    await emitter.emit("deriveAddress", id)
  }
)

export const unlockKeyrings = createBackgroundAsyncThunk(
  "keyrings/unlockKeyrings",
  async (password: string) => {
    await emitter.emit("unlockKeyrings", password)
  }
)

export const lockKeyrings = createBackgroundAsyncThunk(
  "keyrings/lockKeyrings",
  async () => {
    await emitter.emit("lockKeyrings")
  }
)

export const createPassword = createBackgroundAsyncThunk(
  "keyrings/createPassword",
  async (password: string) => {
    await emitter.emit("createPassword", password)
  }
)
