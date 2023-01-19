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

export default class NFTsService extends BaseService<Events> {
  #nextPageUrls: NextPageURLsMap = {}

  #transfersLookupTimestamp: number

  #freshCollections: FreshCollectionsMap = {}

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
    if (
      this.#freshCollections[collectionID]?.[
        normalizeEVMAddress(account.address)
      ]
    ) {
      await this.fetchNFTsFromDatabase(collectionID, account)
    } else {
      await Promise.allSettled(
        getNFTs([account], [collectionID]).map(async (request) => {
          const { nfts, nextPageURLs } = await request
          await this.updateSavedNFTs(collectionID, account, nfts, nextPageURLs)
        })
      )
    }
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
        collectionID,
        [account.network.chainID],
        nextPage
      ).then(async ({ nfts, nextPageURL }) => {
        delete this.#nextPageUrls[collectionID][account.address]

        const nextPageMap: NextPageURLsMap = nextPageURL
          ? { [collectionID]: { [account.address]: nextPageURL } }
          : {}
        await this.updateSavedNFTs(collectionID, account, nfts, nextPageMap)
      })
    }
  }

  async updateSavedNFTs(
    collectionID: string,
    account: AddressOnNetwork,
    nfts: NFT[],
    nextPageURLs: NextPageURLsMap
  ): Promise<void> {
    await this.db.updateNFTs(nfts)

    const updatedNFTs = await this.db.getCollectionNFTsForAccount(
      collectionID,
      account
    )

    this.updateNextPages(nextPageURLs)

    let updatedCollection: NFTCollection | undefined

    if (collectionID === POAP_COLLECTION_ID) {
      // update number of poaps
      updatedCollection = await this.db.updateCollectionData(
        collectionID,
        account,
        {
          nftCount: updatedNFTs.length,
        }
      )
    } else if (updatedNFTs.some((nft) => nft.isBadge)) {
      // update collection as a badges collection
      updatedCollection = await this.db.updateCollectionData(
        collectionID,
        account,
        {
          hasBadges: true,
        }
      )
    }

    if (updatedCollection) {
      this.emitter.emit("updateCollections", [updatedCollection])
    }

    this.setFreshCollection(collectionID, account.address, true)

    const hasNextPage = !!Object.keys(nextPageURLs).length

    await this.emitter.emit("updateNFTs", {
      collectionID,
      account,
      nfts: updatedNFTs,
      hasNextPage,
    })
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
    Object.keys(this.#freshCollections).forEach((collectionID) => {
      if (this.#freshCollections[collectionID][normalizeEVMAddress(address)]) {
        this.setFreshCollection(collectionID, address, false)
      }
    })
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
