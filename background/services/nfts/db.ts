import Dexie from "dexie"
import { AddressOnNetwork } from "../../accounts"
import { FeatureFlags, isEnabled } from "../../features"
import { sameEVMAddress } from "../../lib/utils"
import { NFT, NFTCollection } from "../../nfts"

export class NFTsDatabase extends Dexie {
  private nfts!: Dexie.Table<NFT, number>

  private collections!: Dexie.Table<NFTCollection, number>

  constructor() {
    super("tally/nfts")

    // No tables are created when feature flag is off
    if (isEnabled(FeatureFlags.SUPPORT_NFT_TAB)) {
      this.version(1).stores({
        nfts: "&[id+collectionID+owner+network.chainID]",
        collections: "&[id+owner+network.chainID]",
      })
    }
  }

  async updateNFTs(nfts: NFT[]): Promise<void> {
    await this.nfts.bulkPut(nfts)
  }

  async updateCollections(collections: NFTCollection[]): Promise<void> {
    await this.collections.bulkPut(collections)
  }

  async updateCollectionData(
    collectionID: string,
    { address, network }: AddressOnNetwork,
    data: Partial<NFTCollection>
  ): Promise<NFTCollection | undefined> {
    const collection = await this.collections.get({
      id: collectionID,
      owner: address,
      "network.chainID": network.chainID,
    })

    if (collection) {
      const updatedCollection = {
        ...collection,
        ...data,
      }
      await this.updateCollections([updatedCollection])

      return updatedCollection
    }

    return undefined
  }

  async getAllCollections(): Promise<NFTCollection[]> {
    return this.collections.toArray()
  }

  async getCollectionNFTsForAccount(
    collectionID: string,
    { address, network }: AddressOnNetwork
  ): Promise<NFT[]> {
    return this.nfts
      .filter(
        (nft) =>
          nft.collectionID === collectionID &&
          sameEVMAddress(nft.owner, address) &&
          network.chainID === nft.network.chainID
      )

      .toArray()
  }
}

export async function getOrCreateDB(): Promise<NFTsDatabase> {
  return new NFTsDatabase()
}
