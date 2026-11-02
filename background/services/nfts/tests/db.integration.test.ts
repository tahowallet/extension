import Dexie from "dexie"
import { IDBFactory } from "fake-indexeddb"
import { ETHEREUM } from "../../../constants"
import { getOrCreateDB, NFTsDatabase } from "../db"

const OWNER = "0x1111111111111111111111111111111111111111"
const CAMPAIGN_ID = "campaign::mezo-nft-collection"
const SIMPLE_HASH_ID = "8a7d9b3c4e5f60718293a4b5c6d7e8f9"

const nft = (id: string, collectionID: string) => ({
  id,
  collectionID,
  owner: OWNER,
  network: ETHEREUM,
})

const collection = (id: string) => ({ id, owner: OWNER, network: ETHEREUM })

describe("NFTsDatabase", () => {
  let db: NFTsDatabase

  beforeEach(() => {
    indexedDB = new IDBFactory()
  })

  afterEach(() => db?.close())

  it("clears SimpleHash rows and keeps POAP and campaign rows on upgrade", async () => {
    const legacyDB = new Dexie("tally/nfts")
    legacyDB.version(1).stores({
      nfts: "&[id+collectionID+owner+network.chainID]",
      collections: "&[id+owner+network.chainID]",
    })
    legacyDB.version(2).stores({ preferences: "++id" })
    await legacyDB
      .table("nfts")
      .bulkAdd([
        nft("ethereum.0xabc.1", SIMPLE_HASH_ID),
        nft("123", "POAP"),
        nft("CAMPAIGN.0xdef", CAMPAIGN_ID),
      ])
    await legacyDB
      .table("collections")
      .bulkAdd([
        collection(SIMPLE_HASH_ID),
        collection("POAP"),
        collection(CAMPAIGN_ID),
      ])
    await legacyDB.table("preferences").add({
      transfersLookupTimestamp: 1_700_000_000,
      freshCollections: {
        [SIMPLE_HASH_ID]: { [OWNER]: true },
        [CAMPAIGN_ID]: { [OWNER]: true },
      },
    })
    legacyDB.close()

    db = await getOrCreateDB()

    expect((await db.getAllCollections()).map(({ id }) => id).sort()).toEqual(
      ["POAP", CAMPAIGN_ID].sort(),
    )
    expect(
      await db.getCollectionNFTsForAccount(SIMPLE_HASH_ID, {
        address: OWNER,
        network: ETHEREUM,
      }),
    ).toEqual([])
    expect(
      (
        await db.getCollectionNFTsForAccount("POAP", {
          address: OWNER,
          network: ETHEREUM,
        })
      ).map(({ id }) => id),
    ).toEqual(["123"])
    const preferences = await db.getPreferences()
    expect(preferences.freshCollections).toEqual({
      [CAMPAIGN_ID]: { [OWNER]: true },
    })
    expect(preferences.transfersLookupTimestamp).toBe(1_700_000_000)
  })

  it("adds only ledger entries it doesn't have", async () => {
    db = await getOrCreateDB()
    const entry = {
      id: "1:a:c:1:0xaa:0",
      chainID: "1",
      account: "a",
      contract: "c",
      tokenId: "1",
      from: "z",
      to: "a",
      txHash: "0xaa",
      blockNumber: 1,
      logIndex: 0,
    }

    expect(await db.addERC721Transfers([entry])).toEqual([entry])
    expect(
      await db.addERC721Transfers([entry, { ...entry, id: "1:a:c:1:0xbb:0" }]),
    ).toHaveLength(1)
    expect(await db.getERC721Transfers("1", "a")).toHaveLength(2)
  })

  it("forgets a removed account's ledger and ownership", async () => {
    db = await getOrCreateDB()
    await db.addERC721Transfers([
      {
        id: "1:a",
        chainID: "1",
        account: OWNER,
        contract: "c",
        tokenId: "1",
        from: "z",
        to: OWNER,
        txHash: "0xaa",
        blockNumber: 1,
        logIndex: 0,
      },
    ])
    await db.updateERC721Ownership([
      {
        id: "1:a",
        chainID: "1",
        account: OWNER,
        contract: "c",
        tokenId: "1",
        owned: true,
        checkedAt: 1,
      },
    ])

    await db.removeNFTsForAddress(OWNER)

    expect(await db.getERC721Transfers("1", OWNER)).toEqual([])
    expect(await db.getERC721Ownership("1", OWNER)).toEqual([])
  })
})
