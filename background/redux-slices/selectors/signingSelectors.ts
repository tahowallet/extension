import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { SigningMethod } from "../../utils/signing"
import { selectKeyringSigningAddresses } from "./keyringsSelectors"
import { selectLedgerSigningMethodEntries } from "./ledgerSelectors"
import { selectCurrentAccount } from "./uiSelectors"

export const selectAddressSigningMethods = createSelector(
  selectKeyringSigningAddresses,
  selectLedgerSigningMethodEntries,
  (signingAddresses, ledgerSigningMethodEntries) =>
    Object.fromEntries([
      ...ledgerSigningMethodEntries,
      // Give priority to keyring over Ledger, if an address is signable by both.
      // TODO: check this is the intended behavior
      ...signingAddresses.map((address): [string, SigningMethod] => [
        address,
        { type: "keyring" },
      ]),
    ])
)

export const selectCurrentAccountSigningMethod = createSelector(
  selectAddressSigningMethods,
  (state: RootState) => selectCurrentAccount(state),
  (signingAccounts, selectedAccount): SigningMethod | null =>
    signingAccounts[selectedAccount.address] ?? null
)
