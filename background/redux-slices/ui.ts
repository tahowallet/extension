import { createSlice, createSelector } from "@reduxjs/toolkit"
import { ActivityItem } from "./activities"
import { PropertiesOfType } from "./utils/type-utils"

type SelectedAccount = {
  address: string
  truncatedAddress: string
}

type AvailableSettings = {
  hideDust: boolean
  mainCurrency: string
}

type SettingsOfType<T> = PropertiesOfType<AvailableSettings, T>

export type UIState = {
  selectedAccount: SelectedAccount
  showingActivityDetail: ActivityItem | null
  initializationLoadingTimeExpired: boolean
  settings: AvailableSettings
}

export const initialState: UIState = {
  showingActivityDetail: null,
  selectedAccount: { address: "", truncatedAddress: "" },
  initializationLoadingTimeExpired: false,
  settings: {
    hideDust: false,
    mainCurrency: "USD",
  },
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSetting: (
      state,
      { payload: setting }: { payload: SettingsOfType<boolean> }
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        [setting]: !state.settings[setting],
      },
    }),
    updateSetting: (
      state,
      {
        payload: { setting, value },
      }: { payload: { setting: SettingsOfType<string>; value: string } }
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        [setting]: value,
      },
    }),
    setShowingActivityDetail: (
      state,
      { payload: activityItem }: { payload: ActivityItem | null }
    ): UIState => ({
      ...state,
      showingActivityDetail: activityItem,
    }),
    setSelectedAccount: (immerState, { payload: address }) => {
      const lowercaseAddress = address.toLowerCase()

      immerState.selectedAccount = {
        address: lowercaseAddress,
        truncatedAddress: lowercaseAddress.slice(0, 7),
      }
    },
    initializationLoadingTimeHitLimit: (state) => ({
      ...state,
      initializationLoadingTimeExpired: true,
    }),
  },
})

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleSetting,
  updateSetting,
  setSelectedAccount,
} = uiSlice.actions

export default uiSlice.reducer

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState => state.ui,
  (uiState) => uiState
)

export const selectSettings = createSelector(selectUI, (ui) => ui.settings)

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings?.hideDust
)

export const selectSetting = <T extends keyof AvailableSettings>(
  setting: T
) => {
  return createSelector<
    { ui: UIState },
    AvailableSettings,
    AvailableSettings[T]
  >(selectSettings, (settings) => settings?.[setting])
}
