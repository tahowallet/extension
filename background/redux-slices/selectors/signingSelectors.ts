import { createSelector } from "@reduxjs/toolkit"
import { RootState } from ".."
import { isDefined } from "../../lib/utils/type-guards"
import {
  KeyringAccountSigner,
  PrivateKeyAccountSigner,
} from "../../services/internal-signer"
import { LedgerAccountSigner } from "../../services/ledger"
import { AccountSigner, ReadOnlyAccountSigner } from "../../services/signing"
import type { HexString } from "../../types"
import { unsafeHexString } from "../../lib/utils/hex"
import {
  selectKeyringsByAddresses,
  selectPrivateKeyWalletsByAddress,
} from "./internalSignerSelectors"
import { selectCurrentAccount, selectCurrentAnyAccount } from "./uiSelectors"
import { AnyAddressOnNetwork, isSparkAddressOnNetwork } from "../../accounts"

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
            // Object.entries widens the record's HexString keys to string.
            unsafeHexString(address),
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
            // Object.entries widens the record's HexString keys to string.
            unsafeHexString(address),
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

/**
 * The signer for an account on any network family. Spark accounts are
 * always derived from an internal-signer keyring's recovery phrase.
 */
export const selectSignerForAccount = createSelector(
  selectAccountSignersByAddress,
  (state: RootState) => state.spark.accounts,
  (_: RootState, account: AnyAddressOnNetwork) => account,
  (signingAccounts, sparkAccounts, account): AccountSigner | undefined => {
    if (isSparkAddressOnNetwork(account)) {
      const sparkAccount = Object.values(sparkAccounts).find(
        ({ address, network }) =>
          address === account.address &&
          network.chainID === account.network.chainID,
      )
      return sparkAccount
        ? { type: "keyring", keyringID: sparkAccount.keyringID }
        : undefined
    }
    return signingAccounts[account.address]
  },
)

/**
 * The signer for the account being shown, on any network family.
 */
export const selectCurrentAnyAccountSigner = (
  state: RootState,
): AccountSigner | undefined => {
  const account = selectCurrentAnyAccount(state)
  return account === undefined
    ? undefined
    : selectSignerForAccount(state, account)
}
