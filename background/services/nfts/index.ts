import { AddressOnNetwork } from "../../accounts"
import { FeatureFlags, isEnabled } from "../../features"
import { getNFTCollections, getNFTs } from "../../lib/nfts_update"
import { getSimpleHashNFTs } from "../../lib/simple-hash_update"
import { POAP_COLLECTION_ID } from "../../lib/poap_update"
import { NFTCollection, NFT } from "../../nfts"
import BaseService from "../base"
import ChainService from "../chain"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, NFTsDatabase } from "./db"

interface Events extends ServiceLifecycleEvents {
  isReloadingNFTs: boolean
  initializeNFTs: NFTCollection[]
  updateCollections: NFTCollection[]
  updateNFTs: {
    account: AddressOnNetwork
    collectionID: string
    nfts: NFT[]
    hasNextPage: boolean
  }
}

type NextPageURLsMap = { [collectionID: string]: { [address: string]: string } }

export default class NFTsService extends BaseService<Events> {
  #nextPageUrls: NextPageURLsMap = {}

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
      await this.refreshCollections()

      const collections = await this.db.getAllCollections()
      this.emitter.emit("initializeNFTs", collections)
    })

    this.chainService.emitter.on(
      "newAccountToTrack",
      async (addressOnNetwork) => {
        await this.refreshCollections([addressOnNetwork])
      }
    )
  }

  async refreshCollections(accounts?: AddressOnNetwork[]): Promise<void> {
    const accountsToFetch =
      accounts ?? (await this.chainService.getAccountsToTrack())

    this.emitter.emit("isReloadingNFTs", true)
    await this.fetchCollections(accountsToFetch)
    // prefetch POAPs to avoid loading empty POAPs collections from UI
    await Promise.allSettled(
      accountsToFetch.map((account) =>
        this.fetchNFTsFromCollection(POAP_COLLECTION_ID, account)
      )
    )
    this.emitter.emit("isReloadingNFTs", false)
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
    await Promise.allSettled(
      getNFTs([account], [collectionID]).map(async (request) => {
        const { nfts, nextPageURLs } = await request
        await this.updateSavedNFTs(collectionID, account, nfts, nextPageURLs)
      })
    )
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

  async removeNFTsForAddress(address: string): Promise<void> {
    await this.db.removeNFTsForAddress(address)
  }
}
