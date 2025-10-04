import { createSelector } from "@reduxjs/toolkit"
import { currencies } from "@thesis-co/cent"
import type { RootState } from ".."

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

export const selectCampaigns = createSelector(
  (state: RootState) => state.ui.campaigns,
  (campaigns) => campaigns,
)

export const selectCurrentAddressNetwork = createSelector(
  (state: RootState) => state.ui.selectedAccount,
  (selectedAccount) => selectedAccount,
)

export const selectDisplayCurrency = createSelector(
  (state: RootState) => state.ui,
  (ui) => ui.displayCurrency,
)

export const selectDisplayCurrencySign = createSelector(
  selectDisplayCurrency,
  (currency) => currencies[currency.code].symbol,
)
