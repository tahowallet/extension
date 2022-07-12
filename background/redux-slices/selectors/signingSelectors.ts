import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { isDefined } from "../../lib/utils/type-guards"
import { AccountSigner, ReadOnlyAccountSigner } from "../../services/signing"
import { HexString } from "../../types"
import { selectKeyringsByAddresses } from "./keyringsSelectors"
import { selectCurrentAccount } from "./uiSelectors"

export const selectAccountSignersByAddress = createSelector(
  (state: RootState) => state.ledger.devices,
  selectKeyringsByAddresses,
  (ledgerDevices, keyringsByAddress) => {
    const ledgerEntries = Object.values(ledgerDevices).flatMap((device) =>
      Object.values(device.accounts).flatMap(
        (account): [[HexString, AccountSigner]] | [] => {
          if (account.address === null) return []
          return [
            [
              account.address,
              { type: "ledger", deviceID: device.id, path: account.path },
            ],
          ]
        }
      )
    )

    const keyringEntries = Object.entries(keyringsByAddress)
      .map(([address, keyring]): [HexString, AccountSigner] | undefined =>
        keyring.id === null
          ? undefined
          : [
              address,
              {
                type: "keyring",
                keyringID: keyring.id,
              },
            ]
      )
      .filter(isDefined)

    return Object.fromEntries([
      ...ledgerEntries,
      // Give priority to keyring over Ledger, if an address is signable by
      // both.
      ...keyringEntries,
    ])
  }
)

export const selectCurrentAccountSigner = createSelector(
  selectAccountSignersByAddress,
  selectCurrentAccount,
  (signingAccounts, selectedAccount) =>
    signingAccounts[selectedAccount.address] ?? ReadOnlyAccountSigner
)
