import { FiatCurrency } from "../../assets"
import { AddressOnNetwork } from "../../accounts"
import { AccountSignerSettings } from "../../ui"
import { UNIXTime } from "../../types"

export interface TokenListPreferences {
  autoUpdate: boolean
  urls: string[]
}

export interface Preferences {
  tokenLists: TokenListPreferences
  currency: FiatCurrency
  defaultWallet: boolean
  selectedAccount: AddressOnNetwork
  accountSignersSettings: AccountSignerSettings[]
  analytics: {
    isEnabled: boolean
    hasDefaultOnBeenTurnedOn: boolean
  }
  autoLockTimer: UNIXTime
}

export type AnalyticsPreferences = Preferences["analytics"]
