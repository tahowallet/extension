import { FiatCurrency } from "../../assets"
import { AddressOnNetwork } from "../../accounts"

export interface TokenListPreferences {
  autoUpdate: boolean
  urls: string[]
}

export interface Preferences {
  tokenLists: TokenListPreferences
  currency: FiatCurrency
  defaultWallet: boolean
  selectedAccount: AddressOnNetwork
}
