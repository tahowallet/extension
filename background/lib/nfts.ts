import type { AddressOnNetwork } from "../accounts"
import { getPoapNFTs, getPoapCollections, POAP_COLLECTION_ID } from "./poap"
import {
  NFT,
  CHAIN_ID_TO_NFT_METADATA_PROVIDER,
  NFT_PROVIDER_TO_CHAIN,
  NFTCollection,
  TransferredNFT,
} from "../nfts"
import { MEZO_TESTNET } from "../constants"
import { NFT_COLLECTION_ID } from "../services/campaign/matsnet-nft"
import { FeatureFlags, isEnabled } from "../features"
import type NFTIndexer from "./nft-indexer"

/** Cursors of the next pages, by collection and address. */
export type NextPagesMap = {
  [collectionID: string]: { [address: string]: string }
}

function groupChainsByAddress(accounts: AddressOnNetwork[]) {
  return accounts.reduce<{ [address: string]: string[] }>((acc, account) => {
    const {
      address,
      network: { chainID },
    } = account
    if (CHAIN_ID_TO_NFT_METADATA_PROVIDER[chainID]) {
      acc[address] ??= []
      acc[address].push(chainID)
    }
    return acc
  }, {})
}

/** The networks among `chainIDs` the indexer serves, while it's enabled. */
function indexedChains(chainIDs: string[]): string[] {
  if (!isEnabled(FeatureFlags.SUPPORT_NFT_INDEXER)) {
    return []
  }
  return chainIDs.filter((chainID) =>
    NFT_PROVIDER_TO_CHAIN.indexer.includes(chainID),
  )
}

export function getNFTs(
  accounts: AddressOnNetwork[],
  collections: string[],
  indexer: NFTIndexer,
): Promise<{
  nfts: NFT[]
  nextPages: NextPagesMap
}>[] {
  const chainIDsByAddress = groupChainsByAddress(accounts)

  return Object.entries(chainIDsByAddress).flatMap(
    async ([address, chainIDs]) => {
      const nfts: NFT[] = []
      const nextPages: NextPagesMap = {}

      const poapChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.poap.includes(chainID),
      )

      if (poapChains.length && collections.includes(POAP_COLLECTION_ID)) {
        const { nfts: poapNFTs } = await getPoapNFTs(address)
        nfts.push(...poapNFTs)
      }

      const chainsToIndex = indexedChains(chainIDs)

      if (chainsToIndex.length) {
        await Promise.allSettled(
          collections.map(async (collectionID) => {
            const { nfts: indexedNFTs, nextPage } = await indexer.getNFTs(
              address,
              collectionID,
              chainsToIndex,
            )

            nfts.push(...indexedNFTs)

            if (nextPage) {
              nextPages[collectionID] ??= {}
              nextPages[collectionID][address] = nextPage
            }
          }),
        )
      }

      return {
        nfts,
        nextPages,
      }
    },
  )
}

export function getNFTCollections(
  accounts: AddressOnNetwork[],
  indexer: NFTIndexer,
): Promise<NFTCollection[]>[] {
  const chainIDsByAddress = groupChainsByAddress(accounts)

  return Object.entries(chainIDsByAddress).flatMap(
    async ([address, chainIDs]) => {
      const collections: NFTCollection[] = []

      const poapChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.poap.includes(chainID),
      )

      if (poapChains.length) {
        collections.push(await getPoapCollections(address))
      }

      const campaignChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.campaign.includes(chainID),
      )

      if (campaignChains.length) {
        collections.push({
          id: NFT_COLLECTION_ID,
          name: "TahoXMezo",
          nftCount: undefined,
          owner: address,
          hasBadges: false,
          network: MEZO_TESTNET,
          floorPrice: undefined,
          thumbnailURL: undefined,
        })
      }

      const chainsToIndex = indexedChains(chainIDs)

      if (chainsToIndex.length) {
        collections.push(
          ...(await indexer.getNFTCollections(address, chainsToIndex)),
        )
      }

      return collections
    },
  )
}

/**
 * NFTs the accounts gained or lost since ownership was last checked on the
 * indexer's networks.
 */
export async function getNFTsTransfers(
  accounts: AddressOnNetwork[],
  indexer: NFTIndexer,
): Promise<TransferredNFT[]> {
  const indexedAccounts = accounts.filter(
    ({ network: { chainID } }) => indexedChains([chainID]).length > 0,
  )
  if (!indexedAccounts.length) {
    return []
  }

  return indexer.getNFTsTransfers(indexedAccounts)
}
