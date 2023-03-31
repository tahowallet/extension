import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { ETHEREUM } from "../constants"
import { EVMNetwork } from "../networks"
import { AnalyticsPreferences } from "../services/preferences/types"
import { AccountSignerWithId } from "../signing"
import { AccountSignerSettings } from "../ui"
import { AccountState, addAddressNetwork } from "./accounts"
import { setDerivationPath } from "./ledger"
import { createBackgroundAsyncThunk } from "./utils"

export const defaultSettings = {
  hideDust: false,
  defaultWallet: false,
  showTestNetworks: false,
  collectAnalytics: false,
  showAnalyticsNotification: false,
  hideBanners: false,
}

export type UIState = {
  selectedAccount: AddressOnNetwork
  showingActivityDetailID: string | null
  initializationLoadingTimeExpired: boolean
  settings: {
    hideDust: boolean
    defaultWallet: boolean
    showTestNetworks: boolean
    collectAnalytics: boolean
    showAnalyticsNotification: boolean
    hideBanners: boolean
  }
  snackbarMessage: string
  routeHistoryEntries?: Partial<Location>[]
  slippageTolerance: number
  accountSignerSettings: AccountSignerSettings[]
}

export type Events = {
  snackbarMessage: string
  deleteAnalyticsData: never
  newDefaultWalletValue: boolean
  refreshBackgroundPage: null
  derivationPathChange: string
  newSelectedAccount: AddressOnNetwork
  newSelectedAccountSwitched: AddressOnNetwork
  userActivityEncountered: AddressOnNetwork
  newSelectedNetwork: EVMNetwork
  updateAnalyticsPreferences: Partial<AnalyticsPreferences>
  addCustomNetworkResponse: [string, boolean]
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
  accountSignerSettings: [],
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (
      immerState,
      { payload: shouldHideDust }: { payload: boolean }
    ): void => {
      immerState.settings.hideDust = shouldHideDust
    },
    toggleTestNetworks: (
      immerState,
      { payload: showTestNetworks }: { payload: boolean }
    ): void => {
      immerState.settings.showTestNetworks = showTestNetworks
    },
    toggleCollectAnalytics: (
      state,
      { payload: collectAnalytics }: { payload: boolean }
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        collectAnalytics,
        showAnalyticsNotification: false,
      },
    }),
    setShowAnalyticsNotification: (
      state,
      { payload: showAnalyticsNotification }: { payload: boolean }
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        showAnalyticsNotification,
      },
    }),
    toggleHideBanners: (
      state,
      { payload: hideBanners }: { payload: boolean }
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        hideBanners,
      },
    }),
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
    setAccountsSignerSettings: (
      state,
      { payload }: { payload: AccountSignerSettings[] }
    ) => {
      return { ...state, accountSignerSettings: payload }
    },
  },
})

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleHideDust,
  toggleTestNetworks,
  toggleCollectAnalytics,
  setShowAnalyticsNotification,
  toggleHideBanners,
  setSelectedAccount,
  setSnackbarMessage,
  setDefaultWallet,
  clearSnackbarMessage,
  setRouteHistoryEntries,
  setSlippageTolerance,
  setAccountsSignerSettings,
} = uiSlice.actions

export default uiSlice.reducer

export const updateAnalyticsPreferences = createBackgroundAsyncThunk(
  "ui/updateAnalyticsPreferences",
  async (collectAnalytics: boolean) => {
    await emitter.emit("updateAnalyticsPreferences", {
      isEnabled: collectAnalytics,
    })
  }
)

export const deleteAnalyticsData = createBackgroundAsyncThunk(
  "ui/deleteAnalyticsData",
  async () => {
    await emitter.emit("deleteAnalyticsData")
  }
)

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
    // Do async work needed after the account is switched
    await emitter.emit("newSelectedAccountSwitched", addressNetwork)
  }
)

export const updateSignerTitle = createBackgroundAsyncThunk(
  "ui/updateSignerTitle",
  async (
    [signer, title]: [AccountSignerWithId, string],
    { extra: { main } }
  ) => {
    return main.updateSignerTitle(signer, title)
  }
)

export const getAddNetworkRequestDetails = createBackgroundAsyncThunk(
  "ui/getAddNetworkRequestDetails",
  async (requestId: string, { extra: { main } }) => {
    return main.getAddNetworkRequestDetails(requestId)
  }
)

export const addNetworkUserResponse = createBackgroundAsyncThunk(
  "ui/handleAddNetworkConfirmation",
  async ([requestId, result]: [string, boolean]) => {
    emitter.emit("addCustomNetworkResponse", [requestId, result])
  }
)

export const userActivityEncountered = createBackgroundAsyncThunk(
  "ui/userActivityEncountered",
  async (addressNetwork: AddressOnNetwork) => {
    await emitter.emit("userActivityEncountered", addressNetwork)
  }
)

export const setSelectedNetwork = createBackgroundAsyncThunk(
  "ui/setSelectedNetwork",
  async (network: EVMNetwork, { getState, dispatch }) => {
    const state = getState() as { ui: UIState; account: AccountState }
    const { ui, account } = state
    const currentlySelectedChainID = ui.selectedAccount.network.chainID
    emitter.emit("newSelectedNetwork", network)
    // Add any accounts on the currently selected network to the newly
    // selected network - if those accounts don't yet exist on it.
    Object.keys(
      account.accountsData.evm[currentlySelectedChainID] ?? []
    ).forEach((address) => {
      if (!account.accountsData.evm[network.chainID]?.[address]) {
        dispatch(addAddressNetwork({ address, network }))
      }
    })
    dispatch(setNewSelectedAccount({ ...ui.selectedAccount, network }))
  }
)

export const refreshBackgroundPage = createBackgroundAsyncThunk(
  "ui/refreshBackgroundPage",
  async () => {
    await emitter.emit("refreshBackgroundPage", null)
  }
)

export const derivationPathChange = createBackgroundAsyncThunk(
  "ui/derivationPathChange",
  async (derivationPath: string, { dispatch }) => {
    await emitter.emit("derivationPathChange", derivationPath)
    dispatch(setDerivationPath(derivationPath))
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

export const selectShowAnalyticsNotification = createSelector(
  selectSettings,
  (settings) => settings?.showAnalyticsNotification
)

export const selectSlippageTolerance = createSelector(
  selectUI,
  (ui) => ui.slippageTolerance
)

export const selectInitializationTimeExpired = createSelector(
  selectUI,
  (ui) => ui.initializationLoadingTimeExpired
)

export const selectShowTestNetworks = createSelector(
  selectSettings,
  (settings) => settings?.showTestNetworks
)

export const selectCollectAnalytics = createSelector(
  selectSettings,
  (settings) => settings?.collectAnalytics
)

export const selectHideBanners = createSelector(
  selectSettings,
  (settings) => settings?.hideBanners
)
