import { FiatCurrency } from "../../assets"
import { AddressNetwork } from "../../accounts"

export interface TokenListPreferences {
  autoUpdate: boolean
  urls: string[]
}

export interface Preferences {
  tokenLists: TokenListPreferences
  currency: FiatCurrency
  defaultWallet: boolean
  selectedAccount: AddressNetwork
}
