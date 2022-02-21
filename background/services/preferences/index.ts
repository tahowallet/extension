import { FiatCurrency } from "../../assets"
import { AddressOnNetwork } from "../../accounts"
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"

import { Preferences, TokenListPreferences } from "./types"
import { getOrCreateDB, PreferenceDatabase } from "./db"
import BaseService from "../base"

interface Events extends ServiceLifecycleEvents {
  preferencesChanges: Preferences
  initializeDefaultWallet: boolean
  initializeSelectedAccount: AddressOnNetwork
}

/*
 * The preference service manages user preference persistence, emitting an
 * event when preferences change.
 */
export default class PreferenceService extends BaseService<Events> {
  /*
   * Create a new PreferenceService. The service isn't initialized until
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
      "initializeSelectedAccount",
      await this.getSelectedAccount()
    )
  }

  protected async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  async getCurrency(): Promise<FiatCurrency> {
    return (await this.db.getPreferences())?.currency
  }

  async getTokenListPreferences(): Promise<TokenListPreferences> {
    return (await this.db.getPreferences())?.tokenLists
  }

  async getDefaultWallet(): Promise<boolean> {
    return (await this.db.getPreferences())?.defaultWallet
  }

  async setDefaultWalletValue(newDefaultWalletValue: boolean): Promise<void> {
    return this.db.setDefaultWalletValue(newDefaultWalletValue)
  }

  async getSelectedAccount(): Promise<AddressOnNetwork> {
    return (await this.db.getPreferences())?.selectedAccount
  }

  async setSelectedAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    return this.db.setSelectedAccount(addressNetwork)
  }
}
