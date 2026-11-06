import type { AnyNetwork } from "../../networks"
import type { AnyAddressOnNetwork } from "../../accounts"
import {
  selectCurrentSparkAddressOnNetwork,
  selectCurrentSparkNetwork,
} from "./sparkSelectors"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { selectAllAssets } from "../assets"
import {
  hardcodedMainCurrencySign,
  hardcodedMainCurrencySymbol,
} from "../utils/constants"

export const selectCurrentNetwork = createSelector(
  (state: RootState) => state.ui.selectedAccount.network,
  (selectedNetwork) => selectedNetwork,
)

/**
 * The network the user is looking at: a Spark network when one is picked in
 * the network selector, otherwise the selected account's EVM network. Use
 * this for display; EVM-only code keeps using `selectCurrentNetwork`.
 */
export const selectCurrentAnyNetwork = createSelector(
  selectCurrentSparkNetwork,
  (state: RootState) => state.ui.selectedAccount.network,
  (sparkNetwork, evmNetwork): AnyNetwork => sparkNetwork ?? evmNetwork,
)

/**
 * The account the user is looking at, on any network family. When a Spark
 * network is picked but has no account yet, this is undefined.
 */
export const selectCurrentAnyAccount = createSelector(
  selectCurrentSparkNetwork,
  selectCurrentSparkAddressOnNetwork,
  (state: RootState) => state.ui.selectedAccount,
  (sparkNetwork, sparkAccount, evmAccount): AnyAddressOnNetwork | undefined =>
    sparkNetwork ? sparkAccount : evmAccount,
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
  (state: RootState) => selectAllAssets(state),
  (state: RootState) => selectMainCurrencySymbol(state),
  (_, assets, mainCurrencySymbol) =>
    assets.find((asset) => asset.symbol === mainCurrencySymbol),
)
