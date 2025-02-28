import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import {
  hardcodedMainCurrencySign,
  hardcodedMainCurrencySymbol,
} from "../utils/constants"

export const selectCurrentNetwork = createSelector(
  (state: RootState) => state.ui.selectedAccount.network,
  (selectedNetwork) => selectedNetwork,
)

export const selectCurrentAccount = createSelector(
  (state: RootState) => state.ui.selectedAccount,
  ({ address, network }) => ({
    address,
    network,
    truncatedAddress: address.toLowerCase().slice(0, 7),
  }),
)

export const selectShowingActivityDetail = createSelector(
  (state: RootState) => state.activities.activities,
  selectCurrentAccount,
  (state: RootState) => state.ui.showingActivityDetailID,
  (activities, currentAccountOnNetwork, showingActivityDetailID) => {
    if (!showingActivityDetailID) {
      return null
    }

    return (
      activities[currentAccountOnNetwork.address]?.[
        currentAccountOnNetwork.network.chainID
      ]?.find((activity) => activity.hash === showingActivityDetailID) ?? null
    )
  },
)

export const selectActiveCampaigns = createSelector(
  (state: RootState) => state.ui.activeCampaigns,
  (campaigns) => campaigns,
)

export const selectCurrentAddressNetwork = createSelector(
  (state: RootState) => state.ui.selectedAccount,
  (selectedAccount) => selectedAccount,
)

export const selectMainCurrencySymbol = createSelector(
  (_: RootState) => null,
  () => hardcodedMainCurrencySymbol,
)

export const selectMainCurrencySign = createSelector(
  (_: RootState) => null,
  () => hardcodedMainCurrencySign,
)

export const selectMainCurrency = createSelector(
  (state: RootState) => state.ui,
  (state: RootState) => state.assets,
  (state: RootState) => selectMainCurrencySymbol(state),
  (_, assets, mainCurrencySymbol) =>
    assets.find((asset) => asset.symbol === mainCurrencySymbol),
)
