import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { selectCurrentAccount } from "./uiSelectors"

export const selectKeyringStatus = createSelector(
  (state: RootState) => state.keyrings.status,
  (status) => status
)

export const selectSigningAddresses = createSelector(
  (state: RootState) => state.keyrings.keyrings,
  (keyrings) => keyrings.flatMap((keyring) => keyring.addresses)
)

export const selectIsCurrentAccountSigner = createSelector(
  selectSigningAddresses,
  (state: RootState) => selectCurrentAccount(state),
  (signingAddresses, selectedAccount) =>
    signingAddresses.includes(selectedAccount.address)
)
