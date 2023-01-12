import { FiatCurrency } from "../../assets"
import { AddressOnNetwork } from "../../accounts"
import { AccountSignerSettings } from "../../ui"

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
}

export type AnalyticsPreferences = Preferences["analytics"]
