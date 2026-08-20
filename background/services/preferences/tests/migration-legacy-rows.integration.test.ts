import Dexie from "dexie"
import { IDBFactory } from "fake-indexeddb"
import { PreferenceDatabase, getOrCreateDB } from "../db"

describe("preference migrations against legacy row shapes", () => {
  let db: PreferenceDatabase

  beforeEach(() => {
    indexedDB = new IDBFactory()
  })

  afterEach(() => db?.close())

  it("survives ancient preferences rows without tokenLists", async () => {
    const legacyDB = new Dexie("tally/preferences")
    legacyDB.version(23).stores({
      preferences: "++id",
      signersSettings: "&id",
      shownDismissableItems: "&id,shown",
    })
    // Preferences rows are append-keyed, so long-lived profiles accumulate
    // rows written by much older versions. This shape predates tokenLists.
    await legacyDB.table("preferences").add({
      savedAt: 1600000000000,
      currency: { name: "United States Dollar", symbol: "USD" },
    })
    // And one with tokenLists but a non-array urls value.
    await legacyDB.table("preferences").add({
      savedAt: 1610000000000,
      tokenLists: { autoUpdate: false },
    })
    // A current-shape row on top; getPreferences reads the latest row.
    await legacyDB.table("preferences").add({
      savedAt: Date.now(),
      tokenLists: {
        autoUpdate: false,
        urls: ["https://example.com/list.json"],
      },
    })
    legacyDB.close()

    db = await getOrCreateDB()
    const prefs = await db.getPreferences()
    expect(prefs.tokenLists.urls).toEqual(["https://example.com/list.json"])
  })
})
