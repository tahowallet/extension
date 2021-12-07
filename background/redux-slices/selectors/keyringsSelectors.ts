import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."

export const selectIsCurrentAccountSigner = createSelector(
  (state: RootState) =>
    state.keyrings.keyrings.flatMap((keyring) => keyring.addresses),
  (state: RootState) => state.ui.selectedAccount,
  (addresses, selectedAccount) => addresses.includes(selectedAccount.address)
)

export const selectKeyringStatus = createSelector(
  (state: RootState) => state.keyrings.status,
  (status) => status
)
