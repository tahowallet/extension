import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressNetwork } from "../accounts"
import { getEthereumNetwork } from "../lib/utils"
import { createBackgroundAsyncThunk } from "./utils"

type SelectedAccount = {
  addressNetwork: AddressNetwork
  truncatedAddress: string
}

const defaultSettings = {
  hideDust: false,
  defaultWallet: false,
}

export type UIState = {
  currentAccount: SelectedAccount
  showingActivityDetailID: string | null
  initializationLoadingTimeExpired: boolean
  settings:
    | undefined
    | { hideDust: boolean | undefined; defaultWallet: boolean | undefined }
}

export type Events = {
  newDefaultWalletValue: boolean
}

export const emitter = new Emittery<Events>()

export const initialState: UIState = {
  showingActivityDetailID: null,
  currentAccount: {
    addressNetwork: { address: "", network: getEthereumNetwork() },
    truncatedAddress: "",
  },
  initializationLoadingTimeExpired: false,
  settings: defaultSettings,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (
      immerState,
      { payload: shouldHideDust }: { payload: boolean | undefined }
    ): void => {
      immerState.settings = {
        hideDust: shouldHideDust,
        defaultWallet: immerState.settings?.defaultWallet,
      }
    },
    setShowingActivityDetail: (
      state,
      { payload: transactionID }: { payload: string | null }
    ): UIState => ({
      ...state,
      showingActivityDetailID: transactionID,
    }),
    setCurrentAccount: (immerState, { payload: address }) => {
      const lowercaseAddress = address.toLowerCase()

      immerState.currentAccount = {
        addressNetwork: {
          address: lowercaseAddress,
          network: getEthereumNetwork(),
        },
        truncatedAddress: lowercaseAddress.slice(0, 7),
      }
    },
    initializationLoadingTimeHitLimit: (state) => ({
      ...state,
      initializationLoadingTimeExpired: true,
    }),
    setDefaultWallet: (
      state,
      { payload: defaultWallet }: { payload: boolean | undefined }
    ) => ({
      ...state,
      settings: {
        ...defaultSettings,
        ...state.settings,
        defaultWallet,
      },
    }),
  },
})

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleHideDust,
  setCurrentAccount,
  setDefaultWallet,
} = uiSlice.actions

export default uiSlice.reducer

// Async thunk to bubble the setNewDefaultWalletValue action from  store to emitter.
export const setNewDefaultWalletValue = createBackgroundAsyncThunk(
  "ui/setNewDefaultWalletValue",
  async (defaultWallet: boolean, { dispatch }) => {
    await emitter.emit("newDefaultWalletValue", defaultWallet)
    // Once the default value has persisted, propagate to the store.
    dispatch(uiSlice.actions.setDefaultWallet(defaultWallet))
  }
)

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState
)

export const selectSettings = createSelector(selectUI, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings?.hideDust
)

export const selectDefaultWallet = createSelector(
  selectSettings,
  (settings) => settings?.defaultWallet
)
