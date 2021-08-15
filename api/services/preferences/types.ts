import { FiatCurrency } from "../../types"

export interface TokenListPreferences {
  autoUpdate: boolean
  urls: string[]
}

export interface Preferences {
  tokenLists: TokenListPreferences
  currency: FiatCurrency
}
