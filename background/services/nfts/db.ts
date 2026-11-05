import Dexie from "dexie"
import type { AddressOnNetwork } from "../../accounts"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"
import { NFT, NFTCollection } from "../../nfts"
import { deleteInBatches, findPrimaryKeys } from "../../lib/dexie-batches"

export type FreshCollectionsMap = {
  [collectionID: string]: { [address: string]: boolean }
}

type Preferences = {
  /** When SimpleHash transfers were last looked up; no longer used. */
  transfersLookupTimestamp: number | undefined
  freshCollections: FreshCollectionsMap
}

const DEFAULT_PREFERENCES = {
  transfersLookupTimestamp: undefined,
  freshCollections: {},
}

/**
 * Whether a collection ID comes from a source other than SimpleHash, whose
 * rows version 3 clears.
 */
function isKeptCollectionID(collectionID: string): boolean {
  return collectionID === "POAP" || collectionID.startsWith("campaign::")
}

/**
 * One ERC-721 transfer to or from a tracked account. Addresses are
 * normalized.
 */
export type ERC721LedgerEntry = {
  /** `chainID:account:contract:tokenId:txHash:logIndex` */
  id: string
  chainID: string
  account: string
  contract: string
  tokenId: string
  from: string
  to: string
  txHash: string
  blockNumber: number
  logIndex: number
}

/** Whether an account owned an ERC-721 token when last asked on-chain. */
export type ERC721Ownership = {
  /** `chainID:account:contract:tokenId` */
  id: string
  chainID: string
  account: string
  contract: string
  tokenId: string
  owned: boolean
  checkedAt: number
}

/** A token's metadata as its token URI served it, and fetch failures. */
export type ERC721TokenMetadata = {
  /** `chainID:contract:tokenId` */
  id: string
  name?: string
  description?: string
  image?: string
  attributes: { trait: string; value: string }[]
  /** When the metadata was last fetched successfully. */
  fetchedAt?: number
  /** Failed fetches since the last success. */
  failures: number
  /** No fetch is tried before this time. */
  retryAt?: number
}

/** What a contract said about ERC-165 support, its name and its symbol. */
export type ERC721ContractInfo = {
  /** `chainID:contract` */
  id: string
  isERC721: boolean
  name?: string
  symbol?: string
  checkedAt: number
}

export class NFTsDatabase extends Dexie {
  private nfts!: Dexie.Table<NFT, number>

  private collections!: Dexie.Table<NFTCollection, number>

  private preferences!: Dexie.Table<Preferences>

  private erc721Transfers!: Dexie.Table<ERC721LedgerEntry, string>

  private erc721Ownership!: Dexie.Table<ERC721Ownership, string>

  private erc721Metadata!: Dexie.Table<ERC721TokenMetadata, string>

  private erc721Contracts!: Dexie.Table<ERC721ContractInfo, string>

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
      .upgrade((tx) => tx.db.table("preferences").add(DEFAULT_PREFERENCES))

    // SimpleHash's API is gone, so its rows would never be refreshed.
    this.version(3)
      .stores({
        erc721Transfers: "&id,[chainID+account]",
        erc721Ownership: "&id,[chainID+account]",
        erc721Metadata: "&id",
        erc721Contracts: "&id",
      })
      .upgrade(async (tx) => {
        await tx
          .table<NFT>("nfts")
          .filter(({ collectionID }) => !isKeptCollectionID(collectionID))
          .delete()
        await tx
          .table<NFTCollection>("collections")
          .filter(({ id }) => !isKeptCollectionID(id))
          .delete()
        await tx
          .table<Preferences>("preferences")
          .toCollection()
          .modify((preferences) => {
            preferences.freshCollections = Object.fromEntries(
              Object.entries(preferences.freshCollections ?? {}).filter(
                ([collectionID]) => isKeptCollectionID(collectionID),
              ),
            )
          })
      })

    this.on("populate", (tx) =>
      tx.db.table("preferences").add(DEFAULT_PREFERENCES),
    )
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
    data: Partial<NFTCollection>,
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
    { address, network }: AddressOnNetwork,
  ): Promise<NFT[]> {
    return this.nfts
      .filter(
        (nft) =>
          nft.collectionID === collectionID &&
          sameEVMAddress(nft.owner, address) &&
          network.chainID === nft.network.chainID,
      )

      .toArray()
  }

  /**
   * Returns the chain IDs this database holds NFTs, collections or indexed
   * ERC-721 data for.
   *
   * Note that NFTs and collections are found by reading every row, as their
   * keys end with the chain rather than start with it. Both tables are small,
   * as only POAPs, campaign NFTs and indexed tokens are kept.
   */
  async getChainIDsWithData(): Promise<Set<string>> {
    const chainIDs = new Set<string>()
    const add = (chainID: unknown) => {
      if (typeof chainID === "string") chainIDs.add(chainID)
    }
    await findPrimaryKeys(this.collections, ({ network }) => {
      add(network.chainID)
      return false
    })
    await findPrimaryKeys(this.nfts, ({ network }) => {
      add(network.chainID)
      return false
    })
    ;(await this.erc721Transfers.orderBy("[chainID+account]").uniqueKeys())
      .concat(
        await this.erc721Ownership.orderBy("[chainID+account]").uniqueKeys(),
      )
      .forEach((key) => add(Array.isArray(key) ? key[0] : undefined))
    ;[
      ...(await this.erc721Metadata.toCollection().primaryKeys()),
      ...(await this.erc721Contracts.toCollection().primaryKeys()),
    ].forEach((id) => add(id.split(":")[0]))
    return chainIDs
  }

  /**
   * Removes a chain's NFTs, collections, and indexed ERC-721 transfers,
   * ownership, metadata and contracts, in bounded batches, and returns the
   * number of rows deleted.
   *
   * The service loads every stored collection into the wallet at startup,
   * whatever its chain, so a removed network's NFTs would otherwise come
   * back with each restart.
   *
   * @param chainID The chain whose NFT data to remove.
   */
  async removeChainData(chainID: string): Promise<number> {
    const idPrefix = `${chainID}:`
    const onChain = ({ network }: { network: { chainID?: string } }) =>
      network.chainID === chainID
    const byChain = (
      table: typeof this.erc721Transfers | typeof this.erc721Ownership,
    ) =>
      table
        .where("[chainID+account]")
        .between([chainID, Dexie.minKey], [chainID, Dexie.maxKey])
        .primaryKeys()
    const byIDPrefix = (
      table: typeof this.erc721Metadata | typeof this.erc721Contracts,
    ) => table.where(":id").startsWith(idPrefix).primaryKeys()

    // One table at a time, so each holds the background up only briefly.
    let deleted = 0
    deleted += await deleteInBatches(
      this.nfts,
      await findPrimaryKeys(this.nfts, onChain),
    )
    deleted += await deleteInBatches(
      this.collections,
      await findPrimaryKeys(this.collections, onChain),
    )
    deleted += await deleteInBatches(
      this.erc721Transfers,
      await byChain(this.erc721Transfers),
    )
    deleted += await deleteInBatches(
      this.erc721Ownership,
      await byChain(this.erc721Ownership),
    )
    deleted += await deleteInBatches(
      this.erc721Metadata,
      await byIDPrefix(this.erc721Metadata),
    )
    deleted += await deleteInBatches(
      this.erc721Contracts,
      await byIDPrefix(this.erc721Contracts),
    )
    return deleted
  }

  async removeNFTsForAddress(address: string): Promise<void> {
    await this.nfts.filter((nft) => sameEVMAddress(nft.owner, address)).delete()
    await this.collections
      .filter((collection) => sameEVMAddress(collection.owner, address))
      .delete()
    const account = normalizeEVMAddress(address)
    await this.erc721Transfers.filter((row) => row.account === account).delete()
    await this.erc721Ownership.filter((row) => row.account === account).delete()
  }

  /** Adds ledger entries, returning those it didn't have yet. */
  async addERC721Transfers(
    entries: ERC721LedgerEntry[],
  ): Promise<ERC721LedgerEntry[]> {
    const unique = [
      ...new Map(entries.map((entry) => [entry.id, entry])).values(),
    ]
    return this.transaction("rw", this.erc721Transfers, async () => {
      const existing = await this.erc721Transfers.bulkGet(
        unique.map(({ id }) => id),
      )
      const added = unique.filter((_, index) => existing[index] === undefined)
      await this.erc721Transfers.bulkPut(added)
      return added
    })
  }

  async getERC721Transfers(
    chainID: string,
    account: string,
  ): Promise<ERC721LedgerEntry[]> {
    return this.erc721Transfers
      .where("[chainID+account]")
      .equals([chainID, account])
      .toArray()
  }

  async getERC721Ownership(
    chainID: string,
    account: string,
  ): Promise<ERC721Ownership[]> {
    return this.erc721Ownership
      .where("[chainID+account]")
      .equals([chainID, account])
      .toArray()
  }

  async updateERC721Ownership(rows: ERC721Ownership[]): Promise<void> {
    await this.erc721Ownership.bulkPut(rows)
  }

  async getERC721TokenMetadata(
    ids: string[],
  ): Promise<(ERC721TokenMetadata | undefined)[]> {
    return this.erc721Metadata.bulkGet(ids)
  }

  async updateERC721TokenMetadata(rows: ERC721TokenMetadata[]): Promise<void> {
    await this.erc721Metadata.bulkPut(rows)
  }

  async getERC721Contracts(
    ids: string[],
  ): Promise<(ERC721ContractInfo | undefined)[]> {
    return this.erc721Contracts.bulkGet(ids)
  }

  async updateERC721Contracts(rows: ERC721ContractInfo[]): Promise<void> {
    await this.erc721Contracts.bulkPut(rows)
  }

  async removeNFTsByIDs(removedNFTsIDs: string[]): Promise<void> {
    const nftsToRemove = this.nfts.filter((nft) =>
      removedNFTsIDs.some((removedID) => removedID === nft.id),
    )

    // As we don't know if it was the last NFT in a given collection
    // let's remove it - collection will be refetched in the next step and added
    // to the database if necessary
    const collectionIdsToRemove = (await nftsToRemove.toArray()).reduce(
      (acc, nft) => {
        acc.add(nft.collectionID)
        return acc
      },
      new Set<string>(),
    )

    await this.collections
      .filter((collection) => collectionIdsToRemove.has(collection.id))
      .delete()

    await nftsToRemove.delete()
  }

  async setFreshCollections(
    freshCollections: FreshCollectionsMap,
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
