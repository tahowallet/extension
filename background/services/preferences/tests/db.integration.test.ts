import Dexie from "dexie"
import { IDBFactory } from "fake-indexeddb"
import { PreferenceDatabase, getOrCreateDB } from "../db"
import DEFAULT_PREFERENCES from "../defaults"

const LEGACY_TOKEN_LIST_URLS = [
  "https://ipfs.io/ipfs/bafkreidtegyj34mqah5ejveukif5ht5quddggv2gcb5yfthj5zw43um3y4/",
  "http://ipfs.io/ipns/tokens.uniswap.org",
  "https://messari.io/tokenlist/messari-verified",
  "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json",
  "https://tokenlist.aave.eth.limo",
]

/**
 * Seeds a preferences database at the schema version that preceded the token
 * list cleanup, so that opening `PreferenceDatabase` runs its migrations.
 */
async function seedLegacyPreferences(urls: string[]): Promise<void> {
  const legacyDB = new Dexie("tally/preferences")

  legacyDB.version(23).stores({
    preferences: "++id",
    signersSettings: "&id",
    shownDismissableItems: "&id,shown",
  })

  await legacyDB.table("preferences").add({
    savedAt: Date.now(),
    ...DEFAULT_PREFERENCES,
    tokenLists: { ...DEFAULT_PREFERENCES.tokenLists, urls },
  })

  legacyDB.close()
}

describe("Preference Database", () => {
  let db: PreferenceDatabase

  beforeEach(() => {
    // Reset state of indexedDB
    indexedDB = new IDBFactory()
  })

  afterEach(() => db?.close())

  describe("default token lists", () => {
    it("should not reference token list endpoints that no longer serve token lists", async () => {
      db = await getOrCreateDB()

      const { urls } = (await db.getPreferences()).tokenLists

      expect(urls).not.toContain(
        "https://messari.io/tokenlist/messari-verified",
      )
      expect(urls).not.toContain(
        "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json",
      )
      expect(urls).toContain("https://tokens.uniswap.org")
      // The Taho community list is served from Taho-controlled hosting
      // rather than a public IPFS gateway, which challenges browser UAs.
      expect(urls).toContain("https://tokens.taho.xyz/tokens.json")
      expect(urls.some((url) => url.includes("ipfs.io"))).toBe(false)
    })
  })

  describe("migration to version 24", () => {
    it("should drop dead token lists and move remaining lists to fetchable hosts for existing installs", async () => {
      await seedLegacyPreferences(LEGACY_TOKEN_LIST_URLS)

      db = await getOrCreateDB()

      const { urls } = (await db.getPreferences()).tokenLists

      expect(urls).toEqual([
        "https://tokens.taho.xyz/tokens.json",
        "https://tokens.uniswap.org",
        "https://tokenlist.aave.eth.limo",
      ])
    })

    it("should not duplicate the Uniswap list if it is already canonical", async () => {
      await seedLegacyPreferences([
        "https://tokens.uniswap.org",
        "http://ipfs.io/ipns/tokens.uniswap.org",
      ])

      db = await getOrCreateDB()

      const { urls } = (await db.getPreferences()).tokenLists

      expect(urls).toEqual(["https://tokens.uniswap.org"])
    })
  })
})
