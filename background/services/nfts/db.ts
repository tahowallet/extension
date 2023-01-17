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
    account: AddressOnNetwork,
    data: Partial<NFTCollection>
  ): Promise<NFTCollection | undefined> {
    const collection = await this.getCollection(collectionID, account)
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

  async getCollection(
    collectionID: string,
    { address, network }: AddressOnNetwork
  ): Promise<NFTCollection | undefined> {
    return this.collections.get({
      id: collectionID,
      owner: address,
      "network.chainID": network.chainID,
    })
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

  async removeNFTsForAddress(address: string): Promise<void> {
    await this.nfts.filter((nft) => sameEVMAddress(nft.owner, address)).delete()
    await this.collections
      .filter((collection) => sameEVMAddress(collection.owner, address))
      .delete()
  }

  async removeNFTsByIDs(removedNFTsIDs: string[]): Promise<void> {
    const nftsToRemove = this.nfts.filter((nft) =>
      removedNFTsIDs.some((removedID) => removedID === nft.id)
    )

    // As we don't know if it was the last NFT in a given collection
    // let's remove it - collection will be refetched in the next step and added
    // to the database if necessary
    const collectionIdsToRemove = (await nftsToRemove.toArray()).reduce(
      (acc, nft) => {
        acc.add(nft.collectionID)
        return acc
      },
      new Set<string>()
    )

    await this.collections
      .filter((collection) => collectionIdsToRemove.has(collection.id))
      .delete()

    await nftsToRemove.delete()
  }
}

export async function getOrCreateDB(): Promise<NFTsDatabase> {
  return new NFTsDatabase()
}
