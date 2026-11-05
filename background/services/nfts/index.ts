import { fetchJson } from "@ethersproject/web"
import { Contract } from "ethers"
import type { AddressOnNetwork } from "../../accounts"
import {
  getNFTCollections,
  getNFTs,
  getNFTsTransfers,
  NextPagesMap,
} from "../../lib/nfts"
import NFTIndexer from "../../lib/nft-indexer"
import { POAP_COLLECTION_ID } from "../../lib/poap"
import { NFTCollection, NFT, TransferredNFT } from "../../nfts"
import BaseService from "../base"
import ChainService from "../chain"

import type { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, NFTsDatabase, FreshCollectionsMap } from "./db"
import { normalizeEVMAddress } from "../../lib/utils"
import { MEZO_TESTNET } from "../../constants"
import { sameNetwork } from "../../networks"
import MATSNET_NFT_CAMPAIGN, {
  NFT_COLLECTION_ID,
} from "../campaign/matsnet-nft"
import { FeatureFlags, isDisabled, isEnabled } from "../../features"
import logger from "../../lib/logger"

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

export default class NFTsService extends BaseService<Events> {
  #nextPages: NextPagesMap = {}

  #freshCollections: FreshCollectionsMap = {}

  readonly #indexer: NFTIndexer

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
    this.#indexer = new NFTIndexer({
      db,
      providerFor: (network) => chainService.providerForNetwork(network),
    })
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

      const { freshCollections } = await this.db.getPreferences()
      let collections = await this.db.getAllCollections() // initialize redux from database if possible

      if (!collections.length) {
        // fetch collections for the first time
        await this.initializeCollections()
        collections = await this.db.getAllCollections()
      }

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

    this.chainService.emitter.on(
      "nftTransfers",
      async ({ addressNetwork, nftTransfers }) => {
        if (!isEnabled(FeatureFlags.SUPPORT_NFT_INDEXER)) {
          return
        }
        try {
          const added = await this.#indexer.recordTransfers(
            addressNetwork,
            nftTransfers,
          )
          if (added > 0) {
            await this.refreshIndexedCollections([addressNetwork])
          }
        } catch (error) {
          logger.warn(
            `chain ${addressNetwork.network.chainID}: couldn't index NFT transfers.`,
            { address: addressNetwork.address },
            error,
          )
        }
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

    await this.refreshIndexedCollections(accountsToFetch)
    await this.fetchPOAPs(accountsToFetch)
    await this.fetchCampaignNFTs(accountsToFetch)
  }

  /** Checks indexed NFTs' ownership, refetching collections on changes. */
  async refreshIndexedCollections(accounts: AddressOnNetwork[]): Promise<void> {
    const transfers = await this.fetchTransferredNFTs(accounts)

    if (transfers.length) {
      await this.fetchCollections(accounts) // refetch only if there are some transfers
    }
  }

  async fetchCollections(accounts: AddressOnNetwork[]): Promise<void> {
    await Promise.all(
      getNFTCollections(accounts, this.#indexer).map(async (request) =>
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
        getNFTs([account], [collectionID], this.#indexer).map(
          async (request) => {
            const { nfts, nextPages } = await request
            await this.updateSavedNFTs(collectionID, account, nfts, nextPages)
          },
        ),
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
    const contractAddress = MATSNET_NFT_CAMPAIGN.nftContract
    if (isDisabled("SUPPORT_MEZO_NETWORK") || !contractAddress) {
      return
    }

    const provider = this.chainService.providerForNetworkOrThrow(MEZO_TESTNET)
    const contract = new Contract(
      contractAddress,
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
      hasNextPage: !!this.#nextPages[collectionID]?.[account.address],
    })
  }

  async fetchNFTsFromNextPage(
    collectionID: string,
    account: AddressOnNetwork,
  ): Promise<void> {
    const page = this.#nextPages[collectionID]?.[account.address]

    if (page) {
      const { nfts, nextPage } = await this.#indexer.getNFTs(
        account.address,
        collectionID,
        [account.network.chainID],
        page,
      )
      delete this.#nextPages[collectionID][account.address]

      const nextPages: NextPagesMap = nextPage
        ? { [collectionID]: { [account.address]: nextPage } }
        : {}
      await this.updateSavedNFTs(collectionID, account, nfts, nextPages)
    }
  }

  async updateSavedNFTs(
    collectionID: string,
    account: AddressOnNetwork,
    nfts: NFT[],
    nextPages: NextPagesMap,
  ): Promise<void> {
    await this.db.updateNFTs(nfts)

    const updatedNFTs = await this.db.getCollectionNFTsForAccount(
      collectionID,
      account,
    )

    this.updateNextPages(nextPages)

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

    const hasNextPage = !!Object.keys(nextPages).length

    await this.emitter.emit("updateNFTs", {
      collectionID,
      account,
      nfts: updatedNFTs,
      hasNextPage,
    })
  }

  updateNextPages(nextPages: NextPagesMap): void {
    Object.keys(nextPages).forEach((collectionID) =>
      Object.entries(nextPages[collectionID]).forEach(([address, page]) => {
        this.#nextPages[collectionID] ??= {}
        this.#nextPages[collectionID][address] = page
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

  /**
   * Returns the chain IDs that the NFT database holds data for. See
   * {@link NFTsDatabase.getChainIDsWithData}.
   */
  async getChainIDsWithData(): Promise<Set<string>> {
    return this.db.getChainIDsWithData()
  }

  /**
   * Removes the NFT data kept for a chain that has left the network list,
   * and returns the number of rows deleted.
   *
   * @param chainID The chain whose NFT data to remove.
   */
  async removeChainData(chainID: string): Promise<number> {
    return this.db.removeChainData(chainID)
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

  async fetchTransferredNFTs(
    accounts: AddressOnNetwork[],
  ): Promise<TransferredNFT[]> {
    const transfers = await getNFTsTransfers(accounts, this.#indexer)

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
