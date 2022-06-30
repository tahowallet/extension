import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { ETHEREUM } from "../constants"
import { EVMNetwork } from "../networks"
import { AccountState, addAddressNetwork } from "./accounts"
import { createBackgroundAsyncThunk } from "./utils"

const defaultSettings = {
  hideDust: false,
  defaultWallet: false,
}

export interface Location {
  pathname: string
  key?: string
  hash: string
}

export type UIState = {
  selectedAccount: AddressOnNetwork
  showingActivityDetailID: string | null
  initializationLoadingTimeExpired: boolean
  settings: { hideDust: boolean; defaultWallet: boolean }
  snackbarMessage: string
  routeHistoryEntries?: Partial<Location>[]
  slippageTolerance: number
}

export type Events = {
  snackbarMessage: string
  newDefaultWalletValue: boolean
  refreshBackgroundPage: null
  newSelectedAccount: AddressOnNetwork
  newSelectedNetwork: EVMNetwork
}

export const emitter = new Emittery<Events>()

export const initialState: UIState = {
  showingActivityDetailID: null,
  selectedAccount: {
    address: "",
    network: ETHEREUM,
  },
  initializationLoadingTimeExpired: false,
  settings: defaultSettings,
  snackbarMessage: "",
  slippageTolerance: 0.01,
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (
      immerState,
      { payload: shouldHideDust }: { payload: boolean }
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
    setSelectedAccount: (
      immerState,
      { payload: addressNetwork }: { payload: AddressOnNetwork }
    ) => {
      immerState.selectedAccount = addressNetwork
    },
    initializationLoadingTimeHitLimit: (state) => ({
      ...state,
      initializationLoadingTimeExpired: true,
    }),
    setSnackbarMessage: (
      state,
      { payload: snackbarMessage }: { payload: string }
    ): UIState => {
      return {
        ...state,
        snackbarMessage,
      }
    },
    clearSnackbarMessage: (state): UIState => ({
      ...state,
      snackbarMessage: "",
    }),
    setDefaultWallet: (
      state,
      { payload: defaultWallet }: { payload: boolean }
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        defaultWallet,
      },
    }),
    setRouteHistoryEntries: (
      state,
      { payload: routeHistoryEntries }: { payload: Partial<Location>[] }
    ) => ({
      ...state,
      routeHistoryEntries,
    }),
    setSlippageTolerance: (
      state,
      { payload: slippageTolerance }: { payload: number }
    ) => ({
      ...state,
      slippageTolerance,
    }),
  },
})

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleHideDust,
  setSelectedAccount,
  setSnackbarMessage,
  setDefaultWallet,
  clearSnackbarMessage,
  setRouteHistoryEntries,
  setSlippageTolerance,
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

// TBD @Antonio: It would be good to have a consistent naming strategy
export const setNewSelectedAccount = createBackgroundAsyncThunk(
  "ui/setNewCurrentAddressValue",
  async (addressNetwork: AddressOnNetwork, { dispatch }) => {
    await emitter.emit("newSelectedAccount", addressNetwork)
    // Once the default value has persisted, propagate to the store.
    dispatch(uiSlice.actions.setSelectedAccount(addressNetwork))
  }
)

export const setSelectedNetwork = createBackgroundAsyncThunk(
  "ui/setSelectedNetwork",
  async (network: EVMNetwork, { getState, dispatch }) => {
    emitter.emit("newSelectedNetwork", network)
    const state = getState() as { ui: UIState; account: AccountState }
    const { ui, account } = state
    dispatch(setNewSelectedAccount({ ...ui.selectedAccount, network }))
    if (
      !account.accountsData.evm[network.chainID]?.[ui.selectedAccount.address]
    ) {
      dispatch(addAddressNetwork({ ...ui.selectedAccount, network }))
    }
  }
)

export const refreshBackgroundPage = createBackgroundAsyncThunk(
  "ui/refreshBackgroundPage",
  async () => {
    await emitter.emit("refreshBackgroundPage", null)
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

export const selectSnackbarMessage = createSelector(
  selectUI,
  (ui) => ui.snackbarMessage
)

export const selectDefaultWallet = createSelector(
  selectSettings,
  (settings) => settings?.defaultWallet
)

export const selectSlippageTolerance = createSelector(
  selectUI,
  (ui) => ui.slippageTolerance
)
