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
  preferences: Dexie.Table<Preferences, number>

  migrations: Dexie.Table<Migration, number>

  constructor() {
    super("tally/preferences")
    this.version(1).stores({
      preferences: "++id,savedAt",
      migrations: "++id,appliedAt",
    })
  }

  async getLatestPreferences() {
    return this.preferences.reverse().first()
  }
}

export async function getDB(): Promise<PreferenceDatabase> {
  return new PreferenceDatabase()
}

export async function getOrCreateDB(): Promise<PreferenceDatabase> {
  // TODO run proper dependency and type-free migrations
  const db = await getDB()
  // if there are no migrations, this is a new database.
  const numMigrations = await db.migrations.count()
  if (numMigrations === 0) {
    await db.transaction("rw", db.migrations, db.preferences, async () => {
      db.migrations.add({ id: 0, appliedAt: Date.now() })
      db.preferences.add({
        ...DEFAULT_PREFERENCES,
        savedAt: Date.now(),
      })
    })
  }
  return db
}
