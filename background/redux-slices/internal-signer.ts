import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"

import { createBackgroundAsyncThunk } from "./utils"
import {
  Keyring,
  PrivateKey,
  SignerImportMetadata,
  SignerImportSource,
} from "../services/internal-signer/index"
import { HexString } from "../types"
import { UIState, setNewSelectedAccount } from "./ui"

type KeyringToVerify = {
  id: string
  mnemonic: string[]
} | null

export type InternalSignerState = {
  keyrings: Keyring[]
  privateKeys: PrivateKey[]
  metadata: {
    [keyringId: string]: { source: SignerImportSource }
  }
  status: "locked" | "unlocked" | "uninitialized"
  keyringToVerify: KeyringToVerify
}

export const initialState: InternalSignerState = {
  keyrings: [],
  privateKeys: [],
  metadata: {},
  status: "uninitialized",
  keyringToVerify: null,
}

export type Events = {
  createPassword: string
  lockInternalSigners: never
  generateNewKeyring: string | undefined
  deriveAddress: string
}

export const emitter = new Emittery<Events>()

export const importSigner = createBackgroundAsyncThunk(
  "internalSigner/importSigner",
  async (
    signerRaw: SignerImportMetadata,
    { getState, dispatch, extra: { main } }
  ): Promise<{ success: boolean; errorMessage?: string }> => {
    const address = await main.importSigner(signerRaw)

    if (!address) {
      return {
        success: false,
        errorMessage: "Unexpected error during account import.",
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

const internalSignerSlice = createSlice({
  name: "internalSigner",
  initialState,
  reducers: {
    internalSignerLocked: (state) => ({ ...state, status: "locked" }),
    internalSignerUnlocked: (state) => ({ ...state, status: "unlocked" }),
    updateInternalSigners: (
      state,
      {
        payload: { privateKeys, keyrings, metadata },
      }: {
        payload: {
          privateKeys: PrivateKey[]
          keyrings: Keyring[]
          metadata: { [keyringId: string]: { source: SignerImportSource } }
        }
      }
    ) => {
      // When the InternalSigner service is locked, we receive `updateInternalSigners` with
      // `privateKeys` and `keyrings` being empty lists as the InternalSigner service clears
      // the in-memory keyrings and private keys.
      // For UI purposes, however, we want to continue tracking the metadata,
      // so we ignore an empty list if the service is locked.
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
  updateInternalSigners,
  internalSignerLocked,
  internalSignerUnlocked,
  setKeyringToVerify,
} = internalSignerSlice.actions

export default internalSignerSlice.reducer

// Async thunk to bubble the generateNewKeyring action from  store to emitter.
export const generateNewKeyring = createBackgroundAsyncThunk(
  "internalSigner/generateNewKeyring",
  async (path?: string) => {
    await emitter.emit("generateNewKeyring", path)
  }
)

export const deriveAddress = createBackgroundAsyncThunk(
  "internalSigner/deriveAddress",
  async (id: string) => {
    await emitter.emit("deriveAddress", id)
  }
)

export const unlockInternalSigners = createBackgroundAsyncThunk(
  "internalSigner/unlockInternalSigners",
  async (password: string, { extra: { main } }) => ({
    success: await main.unlockInternalSigners(password),
  })
)

export const lockInternalSigners = createBackgroundAsyncThunk(
  "internalSigner/lockInternalSigners",
  async () => {
    await emitter.emit("lockInternalSigners")
  }
)

export const createPassword = createBackgroundAsyncThunk(
  "internalSigner/createPassword",
  async (password: string) => {
    await emitter.emit("createPassword", password)
  }
)

export const exportMnemonic = createBackgroundAsyncThunk(
  "internalSigner/exportMnemonic",
  async (address: HexString, { extra: { main } }) =>
    main.exportMnemonic(address)
)

export const exportPrivateKey = createBackgroundAsyncThunk(
  "internalSigner/exportPrivateKey",
  async (address: HexString, { extra: { main } }) =>
    main.exportPrivateKey(address)
)
