import { FiatCurrency } from "../../assets"
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"

import { Preferences, TokenListPreferences } from "./types"
import { getOrCreateDB, PreferenceDatabase } from "./db"
import BaseService from "../base"

interface Events extends ServiceLifecycleEvents {
  preferencesChanges: Preferences
  initializeDefaultWallet: boolean
  intilalizeCurrentAddress: string
}

/*
 * The preference service manages user preference persistence, emitting an
 * event when preferences change.
 */
export default class PreferenceService extends BaseService<Events> {
  /*
   * Create a new PrefenceService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<Events, PreferenceService, []> =
    async () => {
      const db = await getOrCreateDB()

      return new this(db)
    }

  private constructor(private db: PreferenceDatabase) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.emitter.emit("initializeDefaultWallet", await this.getDefaultWallet())
    this.emitter.emit(
      "intilalizeCurrentAddress",
      await this.getCurrentAddress()
    )
  }

  protected async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async getCurrency(): Promise<FiatCurrency> {
    return (await this.db.getLatestPreferences())?.currency
  }

  async getTokenListPreferences(): Promise<TokenListPreferences> {
    return (await this.db.getLatestPreferences())?.tokenLists
  }

  async getDefaultWallet(): Promise<boolean> {
    return (await this.db.getLatestPreferences())?.defaultWallet
  }

  async setDefaultWalletValue(newDefaultWalletValue: boolean): Promise<void> {
    return this.db.setDefaultWalletValue(newDefaultWalletValue)
  }

  async getCurrentAddress(): Promise<string> {
    return (await this.db.getLatestPreferences())?.currentAddress
  }

  async setCurrentAddress(currentAddress: string): Promise<void> {
    return this.db.setCurrentAddress(currentAddress)
  }
}
