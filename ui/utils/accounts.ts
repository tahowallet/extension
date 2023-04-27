import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"

export const isAccountWithSecrets = (accountType: AccountType): boolean =>
  accountType === AccountType.Imported ||
  accountType === AccountType.Internal ||
  accountType === AccountType.PrivateKey

export const isAccountWithMnemonic = (accountType: AccountType): boolean =>
  accountType === AccountType.Imported || accountType === AccountType.Internal

export const isAccountSingular = (accountType: AccountType): boolean =>
  accountType === AccountType.PrivateKey || accountType === AccountType.ReadOnly
