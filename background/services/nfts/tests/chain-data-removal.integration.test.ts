import { IDBFactory } from "fake-indexeddb"
import { ETHEREUM } from "../../../constants"
import type { EVMNetwork } from "../../../networks"
import { getOrCreateDB, NFTsDatabase } from "../db"

const OWNER = "0x1111111111111111111111111111111111111111"
const CONTRACT = "0x2222222222222222222222222222222222222222"

const FORK: EVMNetwork = {
  ...ETHEREUM,
  name: "Tenderly Mainnet Fork",
  chainID: "73571",
}

describe("NFTsDatabase chain data removal", () => {
  let db: NFTsDatabase

  /** Stores a row in every table that keeps NFT data for a chain. */
  const storeNFTDataFor = async (network: EVMNetwork) => {
    const { chainID } = network
    await db.updateCollections([
      { id: "POAP", name: "POAP", owner: OWNER, network, hasBadges: true },
    ])
    await db.updateNFTs([
      {
        id: `${chainID}-1`,
        tokenId: "1",
        collectionID: "POAP",
        name: "Badge",
        description: "",
        attributes: [],
        rarity: {},
        contract: CONTRACT,
        owner: OWNER,
        network,
        isBadge: true,
      },
    ])
    await db.addERC721Transfers([
      {
        id: `${chainID}:${OWNER}:${CONTRACT}:1:0xabc:0`,
        chainID,
        account: OWNER,
        contract: CONTRACT,
        tokenId: "1",
        from: CONTRACT,
        to: OWNER,
        txHash: "0xabc",
        blockNumber: 1,
        logIndex: 0,
      },
    ])
    await db.updateERC721Ownership([
      {
        id: `${chainID}:${OWNER}:${CONTRACT}:1`,
        chainID,
        account: OWNER,
        contract: CONTRACT,
        tokenId: "1",
        owned: true,
        checkedAt: 1,
      },
    ])
    await db.updateERC721TokenMetadata([
      { id: `${chainID}:${CONTRACT}:1`, attributes: [], failures: 0 },
    ])
    await db.updateERC721Contracts([
      { id: `${chainID}:${CONTRACT}`, isERC721: true, checkedAt: 1 },
    ])
  }

  beforeEach(async () => {
    indexedDB = new IDBFactory()
    db = await getOrCreateDB()
    await storeNFTDataFor(ETHEREUM)
    await storeNFTDataFor(FORK)
  })

  afterEach(() => db.close())

  it("finds the chains it keeps NFT data for", async () => {
    expect(await db.getChainIDsWithData()).toEqual(
      new Set([ETHEREUM.chainID, FORK.chainID]),
    )
  })

  it("removes a chain's NFT data and leaves other chains alone", async () => {
    // A row in each of six tables.
    expect(await db.removeChainData(FORK.chainID)).toBe(6)

    expect(await db.getChainIDsWithData()).toEqual(new Set([ETHEREUM.chainID]))
    expect(
      (await db.getAllCollections()).map(({ network }) => network.chainID),
    ).toEqual([ETHEREUM.chainID])
    expect(await db.getERC721Transfers(ETHEREUM.chainID, OWNER)).toHaveLength(1)
  })
})
