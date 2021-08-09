import Emittery from "emittery"

import { FiatCurrency } from "../../types"
import { Service } from ".."
import { Preferences, TokenListPreferences } from "./types"
import { getDB, getOrCreateDB, PreferenceDatabase } from "./db"

interface Events {
  preferencesChanges: Preferences
}

export default class PreferenceService implements Service<Events> {
  emitter: Emittery<Events>

  private db: PreferenceDatabase | null

  constructor() {
    this.emitter = new Emittery<Events>()
  }

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
