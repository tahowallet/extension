import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { SigningMethod } from "../signing"
import { selectKeyringSigningAddresses } from "./keyringsSelectors"
import { selectCurrentAccount } from "./uiSelectors"

export const selectAddressSigningMethods = createSelector(
  selectKeyringSigningAddresses,
  (signingAddresses) =>
    Object.fromEntries(
      signingAddresses.map((address) => [address, { type: "keyring" }])
    ) as Record<string, SigningMethod | undefined>
)

export const selectCurrentAccountSigningMethod = createSelector(
  selectAddressSigningMethods,
  (state: RootState) => selectCurrentAccount(state),
  (signingAccounts, selectedAccount): SigningMethod | null =>
    signingAccounts[selectedAccount.address] ?? null
)
