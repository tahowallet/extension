import { AddressOnNetwork } from "../../accounts"
import { FeatureFlags, isEnabled } from "../../features"
import {
  getNFTCollections,
  getNFTs,
  getNFTsTransfers,
} from "../../lib/nfts_update"
import { getSimpleHashNFTs } from "../../lib/simple-hash_update"
import { POAP_COLLECTION_ID } from "../../lib/poap_update"
import { NFTCollection, NFT, TransferredNFT } from "../../nfts"
import BaseService from "../base"
import ChainService from "../chain"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, NFTsDatabase } from "./db"
import { getUNIXTimestamp, normalizeEVMAddress } from "../../lib/utils"
import { MINUTE } from "../../constants"

interface Events extends ServiceLifecycleEvents {
  isReloadingNFTs: boolean
  initializeNFTs: NFTCollection[]
  updateCollections: NFTCollection[]
  removeTransferredNFTs: TransferredNFT[]
  updateNFTs: {
    account: AddressOnNetwork
    collectionID: string
    nfts: NFT[]
    hasNextPage: boolean
  }
}

type NextPageURLsMap = { [collectionID: string]: { [address: string]: string } }
type FreshCollectionsMap = {
  [collectionID: string]: { [address: string]: boolean }
}
type CollectionIDsToFetch = {
  [address: string]: {
    account: AddressOnNetwork
    collections: Set<string>
    nftCount: number
  }
}

export default class NFTsService extends BaseService<Events> {
  #nextPageUrls: NextPageURLsMap = {}

  #transfersLookupTimestamp: number

  #freshCollections: FreshCollectionsMap = {}

  #nftsFromCollectionsToFetch: CollectionIDsToFetch = {}

  #bulkNftsFetchTimeout: number | undefined = undefined

  static create: ServiceCreatorFunction<
    Events,
    NFTsService,
    [Promise<ChainService>]
  > = async (chainService) => {
    return new this(await getOrCreateDB(), await chainService)
  }

  private constructor(
    private db: NFTsDatabase,
    private chainService: ChainService
  ) {
    super()
    this.#transfersLookupTimestamp = getUNIXTimestamp()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    // Nothing else beside creating a service should happen when feature flag is off
    if (isEnabled(FeatureFlags.SUPPORT_NFT_TAB)) {
      this.connectChainServiceEvents()
    }
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  private async connectChainServiceEvents(): Promise<void> {
    this.chainService.emitter.once("serviceStarted").then(async () => {
      this.emitter.emit("isReloadingNFTs", true)
      await this.initializeCollections()
      this.#transfersLookupTimestamp = getUNIXTimestamp(Date.now() - 5 * MINUTE)

      const collections = await this.db.getAllCollections()
      this.emitter.emit("initializeNFTs", collections)
      this.emitter.emit("isReloadingNFTs", false)
    })

    this.chainService.emitter.on(
      "newAccountToTrack",
      async (addressOnNetwork) => {
        this.emitter.emit("isReloadingNFTs", true)
        await this.initializeCollections([addressOnNetwork])
        this.emitter.emit("isReloadingNFTs", false)
      }
    )
  }

  async initializeCollections(accounts?: AddressOnNetwork[]): Promise<void> {
    const accountsToFetch =
      accounts ?? (await this.chainService.getAccountsToTrack())

    if (accountsToFetch.length) {
      await this.fetchCollections(accountsToFetch)
      await this.fetchPOAPs(accountsToFetch)
    }
  }

  async refreshCollections(accounts?: AddressOnNetwork[]): Promise<void> {
    const accountsToFetch =
      accounts ?? (await this.chainService.getAccountsToTrack())

    if (!accountsToFetch.length) return

    const transfers = await this.fetchTransferredNFTs(accountsToFetch)

    if (transfers.sold.length || transfers.bought.length) {
      await this.fetchCollections(accountsToFetch) // refetch only if there are some transfers
    }
    await this.fetchPOAPs(accountsToFetch)
  }

  async fetchCollections(accounts: AddressOnNetwork[]): Promise<void> {
    await Promise.all(
      getNFTCollections(accounts).map(async (request) =>
        request.then(async (collections) => {
          await this.db.updateCollections(collections)

          this.emitter.emit(
            "updateCollections",
            await this.db.getAllCollections()
          )
        })
      )
    )
  }

  async fetchNFTsFromCollection(
    collectionID: string,
    account: AddressOnNetwork
  ): Promise<void> {
    const normalizedAddress = normalizeEVMAddress(account.address)

    if (this.#freshCollections[collectionID]?.[normalizedAddress]) {
      await this.fetchNFTsFromDatabase(collectionID, account)
    } else {
      await this.bulkFetchNFTsFromCollection(collectionID, account)
    }
  }

  async bulkFetchNFTsFromCollection(
    collectionID: string,
    account: AddressOnNetwork
  ): Promise<void> {
    const normalizedAddress = normalizeEVMAddress(account.address)
    const collection = await this.db.getCollection(collectionID, account)
    const key = `${normalizedAddress}${account.network.chainID}`

    this.#nftsFromCollectionsToFetch[key] ??= {
      account,
      collections: new Set<string>(),
      nftCount: 0,
    }
    this.#nftsFromCollectionsToFetch[key].collections.add(collectionID)
    // SimpleHash is able to fetch max 50 NFTs at once, if we expect there will be more than one
    // page of NFTs then we can't do bulk fetch as it would break fetching next pages on demand
    this.#nftsFromCollectionsToFetch[key].nftCount += collection?.nftCount ?? 0

    clearTimeout(this.#bulkNftsFetchTimeout)

    this.#bulkNftsFetchTimeout = window.setTimeout(async () => {
      await Promise.allSettled(
        Object.entries(this.#nftsFromCollectionsToFetch).map(
          ([fetchKey, { account: accountToFetch, collections, nftCount }]) => {
            return Promise.allSettled(
              // bulk fetch only if next page is not expected
              getNFTs([accountToFetch], [...collections], nftCount < 50).map(
                async (request) => {
                  const { nfts, nextPageURLs } = await request

                  await this.updateSavedNFTs(accountToFetch, nfts, nextPageURLs)
                  delete this.#nftsFromCollectionsToFetch[fetchKey]
                }
              )
            )
          }
        )
      )
      this.#bulkNftsFetchTimeout = undefined
    }, 200)
  }

  async fetchPOAPs(accounts: AddressOnNetwork[]): Promise<void> {
    await Promise.allSettled(
      accounts.map((account) =>
        this.fetchNFTsFromCollection(POAP_COLLECTION_ID, account)
      )
    )
  }

  async fetchNFTsFromDatabase(
    collectionID: string,
    account: AddressOnNetwork
  ): Promise<void> {
    await this.emitter.emit("updateNFTs", {
      collectionID,
      account,
      nfts: await this.db.getCollectionNFTsForAccount(collectionID, account),
      hasNextPage: !!this.#nextPageUrls[collectionID]?.[account.address],
    })
  }

  async fetchNFTsFromNextPage(
    collectionID: string,
    account: AddressOnNetwork
  ): Promise<void> {
    const nextPage = this.#nextPageUrls[collectionID]?.[account.address]

    if (nextPage) {
      await getSimpleHashNFTs(
        account.address,
        [collectionID],
        [account.network.chainID],
        nextPage
      ).then(async ({ nfts, nextPageURL }) => {
        delete this.#nextPageUrls[collectionID][account.address]

        const nextPageMap: NextPageURLsMap = nextPageURL
          ? { [collectionID]: { [account.address]: nextPageURL } }
          : {}
        await this.updateSavedNFTs(account, nfts, nextPageMap)
      })
    }
  }

  async updateSavedNFTs(
    account: AddressOnNetwork,
    nfts: NFT[],
    nextPageURLs: NextPageURLsMap
  ): Promise<void> {
    await this.db.updateNFTs(nfts)

    this.updateNextPages(nextPageURLs)

    const savedNFTsByCollectionMap = nfts.reduce((acc, nft) => {
      return acc.set(nft.collectionID, [
        ...(acc.get(nft.collectionID) ?? []),
        nft,
      ])
    }, new Map<string, NFT[]>())

    const updatedCollections: NFTCollection[] = []

    // update number of poaps
    const poaps = nfts.filter((nft) => nft.collectionID === POAP_COLLECTION_ID)
    if (poaps.length) {
      const updated = await this.db.updateCollectionData(
        POAP_COLLECTION_ID,
        account,
        {
          nftCount: poaps.length,
        }
      )
      if (updated) updatedCollections.push(updated)
    }

    // update collections as a badges collections
    const badgesCollections = [
      ...nfts.reduce((acc, nft) => {
        if (nft.collectionID !== POAP_COLLECTION_ID && nft.isBadge) {
          acc.add(nft.collectionID)
        }
        return acc
      }, new Set<string>()),
    ]
    if (badgesCollections.length) {
      await Promise.allSettled(
        badgesCollections.map(async (collectionID) => {
          const updated = await this.db.updateCollectionData(
            collectionID,
            account,
            {
              hasBadges: true,
            }
          )
          if (updated) updatedCollections.push(updated)
        })
      )
    }

    // sync collecions changed in DB with redux
    if (updatedCollections.length) {
      this.emitter.emit("updateCollections", updatedCollections)
    }

    // mark collections as fresh
    ;[...savedNFTsByCollectionMap.keys()].forEach((collectionID) =>
      this.setFreshCollection(collectionID, account.address, true)
    )

    const hasNextPage = !!Object.keys(nextPageURLs).length // TODO

    await Promise.allSettled(
      [...savedNFTsByCollectionMap.entries()].map(
        async ([collectionID, collectionNFTs]) =>
          this.emitter.emit("updateNFTs", {
            collectionID,
            account,
            nfts: collectionNFTs,
            hasNextPage,
          })
      )
    )
  }

  updateNextPages(nextPageURLs: NextPageURLsMap): void {
    Object.keys(nextPageURLs).forEach((collectionID) =>
      Object.entries(nextPageURLs[collectionID]).forEach(([address, url]) => {
        this.#nextPageUrls[collectionID] ??= {}
        this.#nextPageUrls[collectionID][address] = url
      })
    )
  }

  setFreshCollection(
    collectionID: string,
    address: string,
    isFresh: boolean
  ): void {
    // POAPs won't appear in transfers so we don't know if they are stale
    if (collectionID === POAP_COLLECTION_ID) return

    this.#freshCollections[collectionID] ??= {}
    this.#freshCollections[collectionID][normalizeEVMAddress(address)] = isFresh
  }

  async removeNFTsForAddress(address: string): Promise<void> {
    await this.db.removeNFTsForAddress(address)
  }

  async fetchTransferredNFTs(
    accounts: AddressOnNetwork[]
  ): Promise<{ sold: TransferredNFT[]; bought: TransferredNFT[] }> {
    const transfers = await getNFTsTransfers(
      accounts,
      this.#transfersLookupTimestamp
    )

    // indexing transfers can take some time, let's add some margin to the timestamp
    this.#transfersLookupTimestamp = getUNIXTimestamp(Date.now() - 5 * MINUTE)

    const { sold, bought } = transfers.reduce(
      (acc, transfer) => {
        if (transfer.type === "buy") {
          acc.bought.push(transfer)
        } else {
          acc.sold.push(transfer)
        }
        return acc
      },
      { sold: [], bought: [] } as {
        sold: TransferredNFT[]
        bought: TransferredNFT[]
      }
    )

    if (bought.length) {
      // mark collections with new NFTs to be refetched
      bought.forEach((transfer) => {
        const { collectionID, to } = transfer
        if (collectionID && to) {
          this.setFreshCollection(collectionID, to, false)
        }
      })
    }

    if (sold.length) {
      await this.db.removeNFTsByIDs(sold.map((transferred) => transferred.id))
      this.emitter.emit("removeTransferredNFTs", sold)
    }

    return { sold, bought }
  }
}
