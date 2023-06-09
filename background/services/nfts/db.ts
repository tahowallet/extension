import Dexie from "dexie"
import { AddressOnNetwork } from "../../accounts"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"
import { NFT, NFTCollection } from "../../nfts"

export type FreshCollectionsMap = {
  [collectionID: string]: { [address: string]: boolean }
}

type Preferences = {
  transfersLookupTimestamp: number | undefined
  freshCollections: FreshCollectionsMap
}

const DEFAULT_PREFERENCES = {
  transfersLookupTimestamp: undefined,
  freshCollections: {},
}

export class NFTsDatabase extends Dexie {
  private nfts!: Dexie.Table<NFT, number>

  private collections!: Dexie.Table<NFTCollection, number>

  private preferences!: Dexie.Table<Preferences>

  constructor() {
    super("tally/nfts")

    this.version(1).stores({
      nfts: "&[id+collectionID+owner+network.chainID]",
      collections: "&[id+owner+network.chainID]",
    })

    this.version(2)
      .stores({
        preferences: "++id",
      })
      .upgrade((tx) => {
        return tx.db.table("preferences").add(DEFAULT_PREFERENCES)
      })

    this.on("populate", (tx) => {
      return tx.db.table("preferences").add(DEFAULT_PREFERENCES)
    })
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

  async setTransfersLookupTimestamp(
    transfersLookupTimestamp: number
  ): Promise<void> {
    await this.preferences.toCollection().modify({ transfersLookupTimestamp })
  }

  async setFreshCollections(
    freshCollections: FreshCollectionsMap
  ): Promise<void> {
    await this.preferences.toCollection().modify({ freshCollections })
  }

  async setFreshCollectionsFromSavedData(): Promise<FreshCollectionsMap> {
    const freshCollections: FreshCollectionsMap = {}
    const nfts = await this.nfts.toArray()
    nfts.forEach((nft) => {
      const { collectionID } = nft
      const { owner } = nft
      freshCollections[collectionID] ??= {}
      freshCollections[collectionID][normalizeEVMAddress(owner)] = true
    })

    await this.setFreshCollections(freshCollections)

    return freshCollections
  }

  async getPreferences(): Promise<Preferences> {
    return (await this.preferences.reverse().first()) ?? DEFAULT_PREFERENCES
  }
}

export async function getOrCreateDB(): Promise<NFTsDatabase> {
  return new NFTsDatabase()
}
