import { IDBFactory } from "fake-indexeddb"
import { ETHEREUM } from "../../../constants"
import type { EVMNetwork } from "../../../networks"
import { createSmartContractAsset } from "../../../tests/factories"
import { IndexingDatabase, getOrCreateDb } from "../db"

const FORK: EVMNetwork = {
  ...ETHEREUM,
  name: "Tenderly Mainnet Fork",
  chainID: "73571",
}

describe("IndexingDatabase chain data removal", () => {
  let db: IndexingDatabase

  /** Tracks a token and stores custom metadata for another, on a chain. */
  const storeTokensFor = async (network: EVMNetwork) => {
    await db.addAssetToTrack(createSmartContractAsset({ homeNetwork: network }))
    await db.addOrUpdateCustomAsset(
      createSmartContractAsset({ homeNetwork: network }),
    )
  }

  beforeEach(async () => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = await getOrCreateDb()
    await storeTokensFor(ETHEREUM)
    await storeTokensFor(FORK)
  })

  afterEach(() => db.close())

  it("finds the chains it keeps tokens for", async () => {
    expect(await db.getChainIDsWithData()).toEqual(
      new Set([ETHEREUM.chainID, FORK.chainID]),
    )
  })

  it("removes a chain's tokens and leaves other chains alone", async () => {
    expect(await db.removeChainData(FORK.chainID)).toBe(2)

    expect(await db.getChainIDsWithData()).toEqual(new Set([ETHEREUM.chainID]))
    expect(
      (await db.getAssetsToTrack()).map(({ homeNetwork }) => homeNetwork),
    ).toEqual([ETHEREUM])
    expect(
      (await db.getAllCustomAssets()).map(({ homeNetwork }) => homeNetwork),
    ).toEqual([ETHEREUM])
  })
})
