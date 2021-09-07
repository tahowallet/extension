import Dexie from "dexie"

import DEFAULT_PREFERENCES from "./defaults"

export interface Preferences {
  id?: number
  savedAt: number
  [propName: string]: any
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
  }

  async getLatestPreferences(): Promise<Preferences | undefined> {
    return this.preferences.reverse().first()
  }

  private async migrate() {
    const numMigrations = await this.migrations.count()
    if (numMigrations === 0) {
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
    }
  }
}

export async function getOrCreateDB(): Promise<PreferenceDatabase> {
  const db = new PreferenceDatabase()

  // Call known-private migrate function, effectively treating it as
  // file-private.
  // eslint-disable-next-line dot-notation
  await db["migrate"]()

  return db
}
