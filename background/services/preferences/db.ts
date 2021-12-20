import Dexie, { Transaction } from "dexie"
import { FiatCurrency } from "../../assets"

import DEFAULT_PREFERENCES from "./defaults"

// The idea is to use this interface to describe the data structure stored in indexedDb
// In the future this might also have a runtime type check capability, but it's good enough for now.
export interface Preferences {
  id?: number
  savedAt: number
  tokenLists: { autoUpdate: boolean; urls: Array<string> }
  currency: FiatCurrency
  defaultWallet: boolean
  currentAddress: string
}

export class PreferenceDatabase extends Dexie {
  private preferences!: Dexie.Table<Preferences, number>

  constructor() {
    super("tally/preferences")

    // DELETE ME: No need to keep this, but because this service was using a different method
    // I thought it's easier to follow the history if it's here at least utnil we discuss this approach
    this.version(1).stores({
      preferences: "++id,savedAt",
      migrations: "++id,appliedAt",
    })

    // DELETE ME: This is not necessary either, but because there was a different approach
    // implementing the migration I kept it here for now just to make sure
    // the db is in working condition.
    this.version(2)
      .stores({
        preferences: "++id,savedAt,currency,tokenLists,defaultWallet",
      })
      .upgrade((tx) => {
        // TBD @Antonio: I mutate the settings here. This could also be an add
        // but because user actions are mutating this record now, I felt that this is the right approach
        // (did not want to create a new version of the settings every time a user changes the defaultWallet switch)
        // if we decide to go with mutating then getLatestPreferences() should be refactored
        return tx
          .table("preferences")
          .toCollection()
          .modify((storedPreferences) => {
            if (!storedPreferences.deafultWallet) {
              // Dexie api expects modification of the argument:
              // https://dexie.org/docs/Collection/Collection.modify()
              // eslint-disable-next-line no-param-reassign
              storedPreferences.defaultWallet =
                DEFAULT_PREFERENCES.defaultWallet
            }
          })
      })

    // TBD @Antonio: Implemented database versioning and population according to the Dexie docs
    // https://dexie.org/docs/Tutorial/Design#database-versioning
    // I fully expect that I might need to revert all of this, but as per my current knowledge this seems to be a good idea
    this.version(3).stores({
      migrations: null, // If we use dexie built in migrations then we don't need to keep track of them manually
      preferences: "++id", // removed all the unused indexes
    })

    // This is the old version for popuplate
    // https://dexie.org/docs/Dexie/Dexie.on.populate-(old-version)
    // The this does not behave according the new docs, but works
    this.on("populate", function (tx: Transaction) {
      // This could be tx.preferences but the typeing for populate
      // is not generic so it does not know about the preferences table
      tx.table("preferences").add(DEFAULT_PREFERENCES)
    })
  }

  async getLatestPreferences(): Promise<Preferences> {
    // TBD: This will surely return a value because `getOrCreateDB` is called first
    // when the service is created. It runs the migration which writes the `DEFAULT_PREFERENCES`
    return this.preferences.reverse().first() as Promise<Preferences>
  }

  async setDefaultWalletValue(defaultWallet: boolean): Promise<void> {
    await this.preferences.toCollection().modify({ defaultWallet })
  }

  async setCurrentAddress(currentAddress: string): Promise<void> {
    await this.preferences.toCollection().modify({ currentAddress })
  }
}

export async function getOrCreateDB(): Promise<PreferenceDatabase> {
  return new PreferenceDatabase()
}
