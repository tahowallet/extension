import Dexie from "dexie"
import { FiatCurrency } from "../../assets"

import DEFAULT_PREFERENCES from "./defaults"

export interface Preferences {
  id?: number
  savedAt: number
  tokenLists: { autoUpdate: boolean; urls: Array<string> }
  currency: FiatCurrency
  defaultWallet: boolean
}

export interface Migration {
  id: number
  appliedAt: number
}

export class PreferenceDatabase extends Dexie {
  private preferences!: Dexie.Table<Preferences, number>

  private migrations!: Dexie.Table<Migration, number>

  constructor() {
    super("tally/preferences")
    this.version(1).stores({
      preferences: "++id,savedAt",
      migrations: "++id,appliedAt",
    })

    // This is not necessary, to be kept here for Dexie >3.0 but I found it helpful
    // This way it's easy to test a migration scenario and we also can see what has changed
    // TBD: Migration uses a naive approach/has limited capability as it is now
    //  - Extending the schema - adding new properties works fine
    //  - Editing an existing property does not work - we don't want to overwrite the user's settings
    //  - Removeing properties does not work
    // Future improvement: introduce `overwrite` flag with every single setting.
    this.version(2).stores({
      preferences: "++id,savedAt,currency,tokenLists,defaultWallet",
      migrations: "++id,appliedAt",
    })
  }

  async getLatestPreferences(): Promise<Preferences> {
    // TBD: This will surely return a value because `getOrCreateDB` is called first
    // when the service is created. It runs the migration which writes the `DEFAULT_PREFERENCES`
    return this.preferences.reverse().first() as Promise<Preferences>
  }

  async setDefaultWalletValue(newDefaultWalletValue: boolean) {
    const latestConfig = await this.getLatestPreferences()
    const updatedConfig = {
      ...latestConfig,
      defaultWallet: newDefaultWalletValue,
    }
    return this.preferences.put(updatedConfig, latestConfig.id)
  }

  private async migrate() {
    const numMigrations = await this.migrations.count()

    if (numMigrations === 0) {
      // We are initializing the db
      await this.transaction(
        "rw",
        this.migrations,
        this.preferences,
        async () => {
          this.migrations.add({ id: 0, appliedAt: Date.now() })
          this.preferences.add({
            ...DEFAULT_PREFERENCES,
            savedAt: Date.now(),
          })
        }
      )
    } else {
      // We already have a config saved so we want to merge the saved to the new
      const latestConfig = await this.getLatestPreferences()
      await this.transaction(
        "rw",
        this.migrations,
        this.preferences,
        async () => {
          this.migrations.add({ id: numMigrations, appliedAt: Date.now() })
          // We try to keep the settings that already have been set by the user
          // and add the new properties into the schema.
          // We are in a pinch here because we have no idea if we changed the data in the code
          // or the user changed it in his/her app.
          this.preferences.add({
            ...DEFAULT_PREFERENCES,
            ...latestConfig,
            savedAt: Date.now(),
          })
        }
      )
    }
  }
}

export async function getOrCreateDB(): Promise<PreferenceDatabase> {
  const db = new PreferenceDatabase()

  // Call known-private migrate function, effectively treating it as
  // file-private.
  // eslint-disable-next-line @typescript-eslint/dot-notation
  await db["migrate"]()

  return db
}
