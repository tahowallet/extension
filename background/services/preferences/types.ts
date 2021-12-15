import { FiatCurrency } from "../../assets"

export interface TokenListPreferences {
  autoUpdate: boolean
  urls: string[]
}

export interface Preferences {
  tokenLists: TokenListPreferences
  currency: FiatCurrency
  defaultWallet: boolean
}
