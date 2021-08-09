import Emittery from "emittery"

import { FiatCurrency } from "../../types"
import { Service } from ".."
import { Preferences, TokenListPreferences } from "./types"
import { getDB, getOrCreateDB, PreferenceDatabase } from "./db"

interface Events {
  preferencesChanges: Preferences
}

/*
 * The preference service manages user preference persistence, emitting an
 * event when preferences change.
 */
export default class PreferenceService implements Service<Events> {
  emitter: Emittery<Events>

  private db: PreferenceDatabase | null

  /*
   * Create a new PrefenceService. The service isn't initialized until
   * startService() is called and resolved.
   */
  constructor() {
    this.emitter = new Emittery<Events>()
  }

  /*
   * Initialize the PreferenceService, setting up the database.
   */
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
