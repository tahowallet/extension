import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

const mainCurrencySymbol = "USD"

export const selectCurrentAccount = createSelector(
  (state: RootState) => state.ui.currentAccount,
  ({ addressNetwork: { address }, truncatedAddress }) => ({
    address,
    truncatedAddress,
  })
)

export const selectCurrentAddressNetwork = createSelector(
  (state: RootState) => state.ui.currentAccount,
  (currentAccount) => currentAccount
)

export const selectMainCurrency = createSelector(
  (state: RootState) => state.ui,
  (state: RootState) => state.assets,
  (_, assets) => assets.find((asset) => asset.symbol === mainCurrencySymbol)
)
