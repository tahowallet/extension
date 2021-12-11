import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

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
