import Dexie from "dexie"
import { FeatureFlags, isEnabled } from "../../features"
import { NFT, NFTCollection } from "../../nfts"

export class NFTsDatabase extends Dexie {
  private nfts!: Dexie.Table<NFT, number>

  private collections!: Dexie.Table<NFTCollection, number>

  constructor() {
    super("tally/nfts")

    // No tables are created when feature flag is off
    if (isEnabled(FeatureFlags.SUPPORT_NFT_TAB)) {
      this.version(1).stores({
        nfts: "&[id+collectionID+owner+network.chainID],id,collectionID,owner,network.chainID",
        collections: "&[id+owner+network.chainID],id,owner,network.chainID",
      })
    }
  }

  async updateNFTs(nfts: NFT[]): Promise<void> {
    await this.nfts.bulkPut(nfts)
  }

  async updateCollections(collections: NFTCollection[]): Promise<void> {
    await this.collections.bulkPut(collections)
  }

  async getAllCollections(): Promise<NFTCollection[]> {
    return this.collections.toArray()
  }
}

export async function getOrCreateDB(): Promise<NFTsDatabase> {
  return new NFTsDatabase()
}
