import { createSlice, createSelector } from "@reduxjs/toolkit"
import Emittery from "emittery"
import { AddressOnNetwork } from "../accounts"
import { ETHEREUM } from "../constants"
import { AnalyticsEvent, OneTimeAnalyticsEvent } from "../lib/posthog"
import { EVMNetwork } from "../networks"
import { AnalyticsPreferences, DismissableItem } from "../services/preferences"
import { AccountSignerWithId } from "../signing"
import { AccountSignerSettings } from "../ui"
import { AccountState, addAddressNetwork } from "./accounts"
import { createBackgroundAsyncThunk } from "./utils"
import { UNIXTime } from "../types"
import { DEFAULT_AUTOLOCK_INTERVAL } from "../services/preferences/defaults"

export const defaultSettings = {
  hideDust: false,
  defaultWallet: false,
  showTestNetworks: false,
  showNotifications: undefined,
  collectAnalytics: false,
  showAnalyticsNotification: false,
  showUnverifiedAssets: false,
  hideBanners: false,
  useFlashbots: false,
  autoLockInterval: DEFAULT_AUTOLOCK_INTERVAL,
}

export type MezoClaimStatus =
  | "not-eligible"
  | "eligible"
  | "claimed-sats"
  | "borrowed"
  | "campaign-complete"

export type UIState = {
  selectedAccount: AddressOnNetwork
  showingActivityDetailID: string | null
  initializationLoadingTimeExpired: boolean
  shownDismissableItems?: DismissableItem[]
  // FIXME: Move these settings to preferences service db
  settings: {
    hideDust: boolean
    defaultWallet: boolean
    showTestNetworks: boolean
    showNotifications?: boolean
    collectAnalytics: boolean
    showAnalyticsNotification: boolean
    showUnverifiedAssets: boolean
    hideBanners: boolean
    useFlashbots: boolean
    autoLockInterval: UNIXTime
  }
  snackbarMessage: string
  routeHistoryEntries?: Partial<Location>[]
  slippageTolerance: number
  accountSignerSettings: AccountSignerSettings[]
  activeCampaigns: {
    "mezo-claim"?: {
      dateFrom: string
      dateTo: string
      state: MezoClaimStatus
    }
  }
}

export type Events = {
  snackbarMessage: string
  deleteAnalyticsData: never
  newDefaultWalletValue: boolean
  refreshBackgroundPage: null
  sendEvent: AnalyticsEvent | OneTimeAnalyticsEvent
  newSelectedAccount: AddressOnNetwork
  newSelectedAccountSwitched: AddressOnNetwork
  userActivityEncountered: AddressOnNetwork
  newSelectedNetwork: EVMNetwork
  shouldShowNotifications: boolean
  updateAnalyticsPreferences: Partial<AnalyticsPreferences>
  addCustomNetworkResponse: [string, boolean]
  updateAutoLockInterval: number
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
  activeCampaigns: {},
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (
      immerState,
      { payload: shouldHideDust }: { payload: boolean },
    ): void => {
      immerState.settings.hideDust = shouldHideDust
    },
    toggleTestNetworks: (
      immerState,
      { payload: showTestNetworks }: { payload: boolean },
    ): void => {
      immerState.settings.showTestNetworks = showTestNetworks
    },
    toggleShowUnverifiedAssets: (
      immerState,
      { payload: showUnverifiedAssets }: { payload: boolean },
    ): void => {
      immerState.settings.showUnverifiedAssets = showUnverifiedAssets
    },
    toggleUseFlashbots: (
      immerState,
      { payload: useFlashbots }: { payload: boolean },
    ): void => {
      immerState.settings.useFlashbots = useFlashbots
    },
    toggleCollectAnalytics: (
      state,
      { payload: collectAnalytics }: { payload: boolean },
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        collectAnalytics,
        showAnalyticsNotification: false,
      },
    }),
    toggleNotifications: (
      immerState,
      { payload: showNotifications }: { payload: boolean },
    ) => {
      immerState.settings.showNotifications = showNotifications
    },
    setShowAnalyticsNotification: (
      state,
      { payload: showAnalyticsNotification }: { payload: boolean },
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        showAnalyticsNotification,
      },
    }),
    toggleHideBanners: (
      state,
      { payload: hideBanners }: { payload: boolean },
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        hideBanners,
      },
    }),
    setShowingActivityDetail: (
      state,
      { payload: transactionID }: { payload: string | null },
    ): UIState => ({
      ...state,
      showingActivityDetailID: transactionID,
    }),
    setSelectedAccount: (
      immerState,
      { payload: addressNetwork }: { payload: AddressOnNetwork },
    ) => {
      immerState.selectedAccount = addressNetwork
    },
    initializationLoadingTimeHitLimit: (state) => ({
      ...state,
      initializationLoadingTimeExpired: true,
    }),
    setSnackbarMessage: (
      state,
      { payload: snackbarMessage }: { payload: string },
    ): UIState => ({
      ...state,
      snackbarMessage,
    }),
    clearSnackbarMessage: (state): UIState => ({
      ...state,
      snackbarMessage: "",
    }),
    setDefaultWallet: (
      state,
      { payload: defaultWallet }: { payload: boolean },
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        defaultWallet,
      },
    }),
    setShownDismissableItems: (
      state,
      { payload: shownDismissableItems }: { payload: DismissableItem[] },
    ) => ({
      ...state,
      shownDismissableItems,
    }),
    dismissableItemMarkedAsShown: (
      state,
      { payload: shownDismissableItem }: { payload: DismissableItem },
    ) => ({
      ...state,
      shownDismissableItems: [
        ...(state.shownDismissableItems ?? []),
        shownDismissableItem,
      ],
    }),
    setRouteHistoryEntries: (
      state,
      { payload: routeHistoryEntries }: { payload: Partial<Location>[] },
    ) => ({
      ...state,
      routeHistoryEntries,
    }),
    setSlippageTolerance: (
      state,
      { payload: slippageTolerance }: { payload: number },
    ) => ({
      ...state,
      slippageTolerance,
    }),
    setAccountsSignerSettings: (
      state,
      { payload }: { payload: AccountSignerSettings[] },
    ) => ({ ...state, accountSignerSettings: payload }),
    setAutoLockInterval: (state, { payload }: { payload: number }) => ({
      ...state,
      settings: { ...state.settings, autoLockInterval: payload },
    }),
    updateCampaignState: <T extends keyof UIState["activeCampaigns"]>(
      immerState: UIState,
      {
        payload,
      }: {
        payload: [T, Partial<UIState["activeCampaigns"][T]>]
      },
    ) => {
      const [campaignId, update] = payload

      immerState.activeCampaigns ??= {}
      immerState.activeCampaigns[campaignId] = {
        ...immerState.activeCampaigns[campaignId],
        ...update,
      }
    },
  },
})

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleHideDust,
  toggleTestNetworks,
  toggleShowUnverifiedAssets,
  toggleCollectAnalytics,
  toggleUseFlashbots,
  setShowAnalyticsNotification,
  toggleHideBanners,
  toggleNotifications,
  setSelectedAccount,
  setSnackbarMessage,
  setDefaultWallet,
  setShownDismissableItems,
  dismissableItemMarkedAsShown,
  clearSnackbarMessage,
  setRouteHistoryEntries,
  setSlippageTolerance,
  setAccountsSignerSettings,
  setAutoLockInterval,
  updateCampaignState,
} = uiSlice.actions

export default uiSlice.reducer

export const updateAnalyticsPreferences = createBackgroundAsyncThunk(
  "ui/updateAnalyticsPreferences",
  async (collectAnalytics: boolean) => {
    await emitter.emit("updateAnalyticsPreferences", {
      isEnabled: collectAnalytics,
    })
  },
)

export const setShouldShowNotifications = createBackgroundAsyncThunk(
  "ui/showNotifications",
  async (shouldShowNotifications: boolean) => {
    await emitter.emit("shouldShowNotifications", shouldShowNotifications)
  },
)

export const deleteAnalyticsData = createBackgroundAsyncThunk(
  "ui/deleteAnalyticsData",
  async () => {
    await emitter.emit("deleteAnalyticsData")
  },
)

// Async thunk to bubble the setNewDefaultWalletValue action from  store to emitter.
export const setNewDefaultWalletValue = createBackgroundAsyncThunk(
  "ui/setNewDefaultWalletValue",
  async (defaultWallet: boolean, { dispatch }) => {
    await emitter.emit("newDefaultWalletValue", defaultWallet)
    // Once the default value has persisted, propagate to the store.
    dispatch(uiSlice.actions.setDefaultWallet(defaultWallet))
  },
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
  },
)

export const updateSignerTitle = createBackgroundAsyncThunk(
  "ui/updateSignerTitle",
  async ([signer, title]: [AccountSignerWithId, string], { extra: { main } }) =>
    main.updateSignerTitle(signer, title),
)

export const markDismissableItemAsShown = createBackgroundAsyncThunk(
  "ui/markDismissableItemAsShown",
  async (item: DismissableItem, { extra: { main } }) =>
    main.markDismissableItemAsShown(item),
)

export const getAddNetworkRequestDetails = createBackgroundAsyncThunk(
  "ui/getAddNetworkRequestDetails",
  async (requestId: string, { extra: { main } }) =>
    main.getAddNetworkRequestDetails(requestId),
)

export const addNetworkUserResponse = createBackgroundAsyncThunk(
  "ui/handleAddNetworkConfirmation",
  async ([requestId, result]: [string, boolean]) => {
    emitter.emit("addCustomNetworkResponse", [requestId, result])
  },
)

export const updateAutoLockInterval = createBackgroundAsyncThunk(
  "ui/updateAutoLockInterval",
  async (newValue: string) => {
    const parsedValue = parseInt(newValue, 10)

    if (Number.isNaN(parsedValue) || parsedValue <= 1) {
      throw new Error("Invalid value for auto lock timer")
    }

    emitter.emit("updateAutoLockInterval", parsedValue)
  },
)

export const userActivityEncountered = createBackgroundAsyncThunk(
  "ui/userActivityEncountered",
  async (addressNetwork: AddressOnNetwork) => {
    await emitter.emit("userActivityEncountered", addressNetwork)
  },
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
    Object.keys(account.accountsData.evm[currentlySelectedChainID]).forEach(
      (address) => {
        if (!account.accountsData.evm[network.chainID]?.[address]) {
          dispatch(addAddressNetwork({ address, network }))
        }
      },
    )
    dispatch(setNewSelectedAccount({ ...ui.selectedAccount, network }))
  },
)

export const refreshBackgroundPage = createBackgroundAsyncThunk(
  "ui/refreshBackgroundPage",
  async () => {
    await emitter.emit("refreshBackgroundPage", null)
  },
)

export const sendEvent = createBackgroundAsyncThunk(
  "ui/sendEvent",
  async (event: AnalyticsEvent | OneTimeAnalyticsEvent) => {
    await emitter.emit("sendEvent", event)
  },
)

export const toggleFlashbots = createBackgroundAsyncThunk(
  "ui/toggleFlashbots",
  async (value: boolean, { dispatch, extra: { main } }) => {
    await main.toggleFlashbotsProvider(value)
    dispatch(toggleUseFlashbots(value))
  },
)

export const toggleUsingFlashbotsForGivenTx = createBackgroundAsyncThunk(
  "ui/toggleUsingFlashbotsForGivenTx",
  async (value: boolean, { extra: { main } }) => {
    await main.toggleFlashbotsProvider(value)
  },
)

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState,
)

export const selectSettings = createSelector(selectUI, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings?.hideDust,
)

export const selectAutoLockTimer = createSelector(
  selectSettings,
  (settings) => settings.autoLockInterval,
)

export const selectSnackbarMessage = createSelector(
  selectUI,
  (ui) => ui.snackbarMessage,
)

export const selectDefaultWallet = createSelector(
  selectSettings,
  (settings) => settings?.defaultWallet,
)

export const selectShowAnalyticsNotification = createSelector(
  selectSettings,
  (settings) => settings?.showAnalyticsNotification,
)

export const selectSlippageTolerance = createSelector(
  selectUI,
  (ui) => ui.slippageTolerance,
)

export const selectInitializationTimeExpired = createSelector(
  selectUI,
  (ui) => ui.initializationLoadingTimeExpired,
)

export const selectShowTestNetworks = createSelector(
  selectSettings,
  (settings) => settings?.showTestNetworks,
)

export const selectShowUnverifiedAssets = createSelector(
  selectSettings,
  (settings) => settings?.showUnverifiedAssets,
)

export const selectCollectAnalytics = createSelector(
  selectSettings,
  (settings) => settings?.collectAnalytics,
)

export const selectShowNotifications = createSelector(
  selectSettings,
  (settings) => settings?.showNotifications,
)

export const selectHideBanners = createSelector(
  selectSettings,
  (settings) => settings?.hideBanners,
)

export const selectUseFlashbots = createSelector(
  selectSettings,
  (settings) => settings?.useFlashbots,
)

export function selectShouldShowDismissableItem(
  dismissableItem: DismissableItem,
) {
  return (state: { ui: UIState }): boolean => {
    const itemWasShown =
      selectUI(state).shownDismissableItems?.includes(dismissableItem) ?? false
    return !itemWasShown
  }
}
