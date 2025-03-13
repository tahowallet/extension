import { fetchJson } from "@ethersproject/web"
import { Contract } from "ethers"
import { AddressOnNetwork } from "../../accounts"
import { getNFTCollections, getNFTs, getNFTsTransfers } from "../../lib/nfts"
import { getSimpleHashNFTs } from "../../lib/simple-hash"
import { POAP_COLLECTION_ID } from "../../lib/poap"
import { NFTCollection, NFT, TransferredNFT } from "../../nfts"
import BaseService from "../base"
import ChainService from "../chain"

import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, NFTsDatabase, FreshCollectionsMap } from "./db"
import { getUNIXTimestamp, normalizeEVMAddress } from "../../lib/utils"
import { MEZO_TESTNET, MINUTE } from "../../constants"
import { sameNetwork } from "../../networks"
import { NFT_COLLECTION_ID } from "../campaign/matsnet-nft"

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

export default class NFTsService extends BaseService<Events> {
  #nextPageUrls: NextPageURLsMap = {}

  #transfersLookupTimestamp: number

  #freshCollections: FreshCollectionsMap = {}

  static create: ServiceCreatorFunction<
    Events,
    NFTsService,
    [Promise<ChainService>]
  > = async (chainService) =>
    new this(await getOrCreateDB(), await chainService)

  private constructor(
    private db: NFTsDatabase,
    private chainService: ChainService,
  ) {
    super()
    this.#transfersLookupTimestamp = getUNIXTimestamp() // will be discarded when chainService starts
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    this.connectChainServiceEvents()
  }

  protected override async internalStopService(): Promise<void> {
    this.db.close()

    await super.internalStopService()
  }

  private async connectChainServiceEvents(): Promise<void> {
    this.chainService.emitter.once("serviceStarted").then(async () => {
      this.emitter.emit("isReloadingNFTs", true)

      const { transfersLookupTimestamp, freshCollections } =
        await this.db.getPreferences()
      let collections = await this.db.getAllCollections() // initialize redux from database if possible

      if (!collections.length) {
        // fetch collections for the first time
        await this.initializeCollections()
        collections = await this.db.getAllCollections()
      }

      // use latest lookup timestamp
      this.#transfersLookupTimestamp =
        transfersLookupTimestamp ?? (await this.setTransfersLookupTimestamp())

      this.#freshCollections = Object.keys(freshCollections).length
        ? freshCollections
        : await this.db.setFreshCollectionsFromSavedData()

      this.emitter.emit("initializeNFTs", collections)
      this.emitter.emit("isReloadingNFTs", false)
    })

    this.chainService.emitter.on(
      "newAccountToTrack",
      async (addressOnNetwork) => {
        this.emitter.emit("isReloadingNFTs", true)
        await this.initializeCollections([addressOnNetwork])
        this.emitter.emit("isReloadingNFTs", false)
      },
    )
  }

  async initializeCollections(accounts?: AddressOnNetwork[]): Promise<void> {
    const accountsToFetch =
      accounts ?? (await this.chainService.getAccountsToTrack())

    if (accountsToFetch.length) {
      await this.fetchCollections(accountsToFetch)
      await this.fetchPOAPs(accountsToFetch)
      await this.fetchCampaignNFTs(accountsToFetch)
    }
  }

  async refreshCollections(accounts?: AddressOnNetwork[]): Promise<void> {
    const accountsToFetch =
      accounts ?? (await this.chainService.getAccountsToTrack())

    if (!accountsToFetch.length) return

    const transfers = await this.fetchTransferredNFTs(accountsToFetch)

    if (transfers.length) {
      await this.fetchCollections(accountsToFetch) // refetch only if there are some transfers
    }
    await this.fetchPOAPs(accountsToFetch)
    await this.fetchCampaignNFTs(accountsToFetch)
  }

  async fetchCollections(accounts: AddressOnNetwork[]): Promise<void> {
    await Promise.all(
      getNFTCollections(accounts).map(async (request) =>
        request.then(async (collections) => {
          await this.db.updateCollections(collections)

          this.emitter.emit(
            "updateCollections",
            await this.db.getAllCollections(),
          )
        }),
      ),
    )
  }

  async refreshNFTsFromCollection(
    collectionID: string,
    account: AddressOnNetwork,
  ): Promise<void> {
    this.setFreshCollection(collectionID, account.address, false)
    await this.db.setFreshCollections(this.#freshCollections)
    await this.fetchNFTsFromCollection(collectionID, account)
  }

  async fetchNFTsFromCollection(
    collectionID: string,
    account: AddressOnNetwork,
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
        }),
      )
    }
  }

  async fetchPOAPs(accounts: AddressOnNetwork[]): Promise<void> {
    await Promise.allSettled(
      accounts.map((account) =>
        this.fetchNFTsFromCollection(POAP_COLLECTION_ID, account),
      ),
    )
  }

  async fetchCampaignNFTs(accounts: AddressOnNetwork[]): Promise<void> {
    const provider = this.chainService.providerForNetworkOrThrow(MEZO_TESTNET)
    const contract = new Contract(
      "0x2A22371b53E6070AF6e38dfFC4228496b469D7FA",
      [
        "function balanceOf(address, uint256) view returns (uint256)",
        "function uri(uint256) view returns (string)",
      ],
      provider,
    )

    await Promise.allSettled(
      accounts
        .filter(({ network }) => sameNetwork(network, MEZO_TESTNET))
        .map(async (account) => {
          const { address } = account

          const hasTahoNFT =
            (await contract.callStatic.balanceOf(address, 1)) > 0n

          const nfts: NFT[] = []

          if (hasTahoNFT) {
            const metadataURI = await contract.callStatic.uri(1)

            const details = await fetchJson(metadataURI)

            nfts.push({
              collectionID: NFT_COLLECTION_ID,
              id: `CAMPAIGN.${contract.address}.${address}`,
              previewURL: details.image,
              thumbnailURL: details.image,
              name: details.name,
              description: details.description,
              tokenId: "1",
              contract: contract.address,
              owner: address,
              isBadge: false,
              network: MEZO_TESTNET,
              attributes: [],
              rarity: {},
            })

            await this.updateSavedNFTs(NFT_COLLECTION_ID, account, nfts, {})
          }
        }),
    )
  }

  async fetchNFTsFromDatabase(
    collectionID: string,
    account: AddressOnNetwork,
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
    account: AddressOnNetwork,
  ): Promise<void> {
    const nextPage = this.#nextPageUrls[collectionID]?.[account.address]

    if (nextPage) {
      await getSimpleHashNFTs(
        account.address,
        collectionID,
        [account.network.chainID],
        nextPage,
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
    nextPageURLs: NextPageURLsMap,
  ): Promise<void> {
    await this.db.updateNFTs(nfts)

    const updatedNFTs = await this.db.getCollectionNFTsForAccount(
      collectionID,
      account,
    )

    this.updateNextPages(nextPageURLs)

    let updatedCollection: NFTCollection | undefined

    if (
      collectionID === POAP_COLLECTION_ID ||
      collectionID.startsWith("campaign::")
    ) {
      // update number of poaps
      updatedCollection = await this.db.updateCollectionData(
        collectionID,
        account,
        {
          nftCount: updatedNFTs.length,
        },
      )
    } else if (updatedNFTs.some((nft) => nft.isBadge)) {
      // update collection as a badges collection
      updatedCollection = await this.db.updateCollectionData(
        collectionID,
        account,
        {
          hasBadges: true,
        },
      )
    }

    if (updatedCollection) {
      this.emitter.emit("updateCollections", [updatedCollection])
    }

    // if NFTs were fetched then mark as fresh
    this.setFreshCollection(collectionID, account.address, !!updatedNFTs.length)
    await this.db.setFreshCollections(this.#freshCollections)

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
      }),
    )
  }

  setFreshCollection(
    collectionID: string,
    address: string,
    isFresh: boolean,
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
    await this.db.setFreshCollections(this.#freshCollections)
  }

  async setTransfersLookupTimestamp(): Promise<number> {
    // indexing transfers can take some time, let's add some margin to the timestamp
    const timestamp = getUNIXTimestamp(Date.now() - 2 * MINUTE)
    await this.db.setTransfersLookupTimestamp(timestamp)
    return timestamp
  }

  async fetchTransferredNFTs(
    accounts: AddressOnNetwork[],
  ): Promise<TransferredNFT[]> {
    const transfers = await getNFTsTransfers(
      accounts,
      this.#transfersLookupTimestamp,
    )

    this.#transfersLookupTimestamp = await this.setTransfersLookupTimestamp()

    // mark collections with transferred NFTs to be refetched
    transfers.forEach((transfer) => {
      const { collectionID, to, from, isKnownFromAddress, isKnownToAddress } =
        transfer
      if (collectionID && to && isKnownToAddress) {
        this.setFreshCollection(collectionID, to, false)
      }
      if (collectionID && from && isKnownFromAddress) {
        this.setFreshCollection(collectionID, from, false)
      }
    })
    await this.db.setFreshCollections(this.#freshCollections)

    const knownFromAddress = transfers.filter(
      (transfer) => transfer.isKnownFromAddress,
    )

    if (knownFromAddress.length) {
      await this.db.removeNFTsByIDs(
        knownFromAddress.map((transferred) => transferred.id),
      )
      this.emitter.emit("removeTransferredNFTs", knownFromAddress)
    }

    return transfers
  }
}
