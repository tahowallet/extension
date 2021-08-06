import { FiatCurrency } from "../../types"
import { Service } from ".."
import { TokenListPreferences } from "./types"
import { getDB, getOrCreateDB, PreferenceDatabase } from "./db"

export default class PreferenceService implements Service {
  db: PreferenceDatabase | null

  async startService(): Promise<void> {
    this.db = await getOrCreateDB()
  }

  async stopService(): Promise<void> {
    this.db.close()
    this.db = null
  }

  async getCurrency(): Promise<FiatCurrency> {
    return (await this.db.getLatestPreferences()).currency
  }

  async getTokenListPreferences(): Promise<TokenListPreferences> {
    return (await this.db.getLatestPreferences()).tokenLists
  }
}
