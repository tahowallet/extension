import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { isDefined } from "../../lib/utils/type-guards"
import {
  KeyringAccountSigner,
  PrivateKeyAccountSigner,
} from "../../services/internal-signer"
import { LedgerAccountSigner } from "../../services/ledger"
import { AccountSigner, ReadOnlyAccountSigner } from "../../services/signing"
import { HexString } from "../../types"
import {
  selectKeyringsByAddresses,
  selectPrivateKeyWalletsByAddress,
} from "./internalSignerSelectors"
import { selectCurrentAccount } from "./uiSelectors"

// FIXME: This has a duplicate in `accountSelectors.ts`, but importing causes a dependency cycle
const getAllAddresses = createSelector(
  (state: RootState) => state.account,
  (account) => [
    ...new Set(
      Object.values(account.accountsData.evm).flatMap((chainAddresses) =>
        Object.keys(chainAddresses),
      ),
    ),
  ],
)

export const selectAccountSignersByAddress = createSelector(
  getAllAddresses,
  (state: RootState) => state.ledger.devices,
  selectKeyringsByAddresses,
  selectPrivateKeyWalletsByAddress,
  (
    allAddresses,
    ledgerDevices,
    keyringsByAddress,
    privateKeyWalletsByAddress,
  ) => {
    const allAccountsSeen = new Set<string>()
    const ledgerEntries = Object.values(ledgerDevices).flatMap((device) =>
      Object.values(device.accounts).flatMap(
        (account): [[HexString, LedgerAccountSigner]] | [] => {
          if (account.address === null) return []

          allAccountsSeen.add(account.address)
          return [
            [
              account.address,
              { type: "ledger", deviceID: device.id, path: account.path },
            ],
          ]
        },
      ),
    )

    const keyringEntries = Object.entries(keyringsByAddress)
      .map(
        ([address, keyring]): [HexString, KeyringAccountSigner] | undefined => {
          if (keyring.id === null) {
            return undefined
          }

          allAccountsSeen.add(address)

          return [
            address,
            {
              type: "keyring",
              keyringID: keyring.id,
            },
          ]
        },
      )
      .filter(isDefined)

    const privateKeyEntries = Object.entries(privateKeyWalletsByAddress)
      .map(
        ([address, wallet]):
          | [HexString, PrivateKeyAccountSigner]
          | undefined => {
          if (wallet.id === null) {
            return undefined
          }

          allAccountsSeen.add(address)

          return [
            address,
            {
              type: "private-key",
              walletID: wallet.id,
            },
          ]
        },
      )
      .filter(isDefined)

    const readOnlyEntries: [string, typeof ReadOnlyAccountSigner][] =
      allAddresses
        .filter((address) => !allAccountsSeen.has(address))
        .map((address) => [address, ReadOnlyAccountSigner])

    const entriesByPriority: [string, AccountSigner][] = [
      ...readOnlyEntries,
      ...privateKeyEntries,
      ...ledgerEntries,
      // Give priority to keyring over Ledger and private key, if an address is signable by
      // both.
      ...keyringEntries,
    ]

    return Object.fromEntries(entriesByPriority)
  },
)

export const selectCurrentAccountSigner = createSelector(
  selectAccountSignersByAddress,
  selectCurrentAccount,
  (signingAccounts, selectedAccount) =>
    signingAccounts[selectedAccount.address],
)
