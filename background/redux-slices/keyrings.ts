import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { createBackgroundAsyncThunk } from "./utils"
import {
  Keyring,
  PrivateKey,
  SignerMetadata,
  SignerRawWithType,
} from "../services/keyring/index"
import { HexString } from "../types"
import logger from "../lib/logger"
import { UIState, setNewSelectedAccount } from "./ui"

type KeyringToVerify = {
  id: string
  mnemonic: string[]
} | null

export type KeyringsState = {
  keyrings: Keyring[]
  privateKeys: PrivateKey[]
  metadata: {
    [keyringId: string]: SignerMetadata
  }
  status: "locked" | "unlocked" | "uninitialized"
  keyringToVerify: KeyringToVerify
}

export const initialState: KeyringsState = {
  keyrings: [],
  privateKeys: [],
  metadata: {},
  status: "uninitialized",
  keyringToVerify: null,
}

export type Events = {
  createPassword: string
  lockKeyrings: never
  generateNewKeyring: string | undefined
  deriveAddress: string
}

export const emitter = new Emittery<Events>()

export const importSigner = createBackgroundAsyncThunk(
  "keyrings/importSigner",
  async (
    signerRaw: SignerRawWithType,
    { getState, dispatch, extra: { main } }
  ): Promise<{ success: boolean; errorMessage?: string }> => {
    let address = null

    try {
      address = await main.importSigner(signerRaw)
    } catch (error) {
      logger.error("Internal signer import failed:", error)

      return {
        success: false,
        errorMessage: "Unexpected error during account import.",
      }
    }

    if (!address) {
      return {
        success: false,
        errorMessage:
          "Failed to import new account. Address may already be imported.",
      }
    }

    const { ui } = getState() as {
      ui: UIState
    }

    dispatch(
      setNewSelectedAccount({
        address,
        network: ui.selectedAccount.network,
      })
    )

    return { success: true }
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
        payload: { privateKeys, keyrings, metadata },
      }: {
        payload: {
          privateKeys: PrivateKey[]
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
        keyrings,
        privateKeys,
        metadata,
      }
    },
    setKeyringToVerify: (state, { payload }: { payload: KeyringToVerify }) => ({
      ...state,
      keyringToVerify: payload,
    }),
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
  async (password: string, { extra: { main } }) => {
    return { success: await main.unlockKeyrings(password) }
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

export const exportMnemonic = createBackgroundAsyncThunk(
  "keyrings/exportMnemonic",
  async (address: HexString, { extra: { main } }) => {
    return main.exportMnemonic(address)
  }
)

export const exportPrivateKey = createBackgroundAsyncThunk(
  "keyrings/exportPrivateKey",
  async (address: HexString, { extra: { main } }) => {
    return main.exportPrivateKey(address)
  }
)
