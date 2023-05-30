import { AddressOnNetwork } from "../accounts"
import {
  getSimpleHashCollections,
  getSimpleHashNFTs,
  getSimpleHashNFTsTransfers,
} from "./simple-hash"
import { getPoapNFTs, getPoapCollections, POAP_COLLECTION_ID } from "./poap"
import {
  NFT,
  CHAIN_ID_TO_NFT_METADATA_PROVIDER,
  NFT_PROVIDER_TO_CHAIN,
  NFTCollection,
  TransferredNFT,
} from "../nfts"
import { UNIXTime } from "../types"

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

export function getNFTs(
  accounts: AddressOnNetwork[],
  collections: string[]
): Promise<{
  nfts: NFT[]
  nextPageURLs: { [collectionID: string]: { [address: string]: string } }
}>[] {
  const chainIDsByAddress = groupChainsByAddress(accounts)

  return Object.entries(chainIDsByAddress).flatMap(
    async ([address, chainIDs]) => {
      const nfts: NFT[] = []
      const nextPageURLs: {
        [collectionID: string]: { [address: string]: string }
      } = {}

      const poapChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.poap.includes(chainID)
      )

      if (poapChains.length && collections.includes(POAP_COLLECTION_ID)) {
        const { nfts: poapNFTs } = await getPoapNFTs(address)
        nfts.push(...poapNFTs)
      }

      const simpleHashChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.simplehash.includes(chainID)
      )

      if (simpleHashChains.length) {
        await Promise.allSettled(
          collections.map(async (collectionID) => {
            if (collectionID === POAP_COLLECTION_ID) return // Don't fetch POAP from SimpleHash

            const { nfts: simpleHashNFTs, nextPageURL } =
              await getSimpleHashNFTs(address, collectionID, simpleHashChains)

            nfts.push(...simpleHashNFTs)

            if (nextPageURL) {
              nextPageURLs[collectionID] ??= {}
              nextPageURLs[collectionID][address] = nextPageURL
            }
          })
        )
      }

      return {
        nfts,
        nextPageURLs,
      }
    }
  )
}

export function getNFTCollections(
  accounts: AddressOnNetwork[]
): Promise<NFTCollection[]>[] {
  const chainIDsByAddress = groupChainsByAddress(accounts)

  return Object.entries(chainIDsByAddress).flatMap(
    async ([address, chainIDs]) => {
      const collections: NFTCollection[] = []

      const poapChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.poap.includes(chainID)
      )

      if (poapChains.length) {
        collections.push(await getPoapCollections(address))
      }

      const simpleHashChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.simplehash.includes(chainID)
      )

      if (simpleHashChains.length) {
        collections.push(...(await getSimpleHashCollections(address, chainIDs)))
      }

      return collections
    }
  )
}

export async function getNFTsTransfers(
  accounts: AddressOnNetwork[],
  timestamp: UNIXTime
): Promise<TransferredNFT[]> {
  const { addresses, chains } = accounts.reduce<{
    addresses: Set<string>
    chains: Set<string>
  }>(
    (acc, account) => {
      acc.addresses.add(account.address)
      acc.chains.add(account.network.chainID)

      return acc
    },
    { addresses: new Set(), chains: new Set() }
  )

  const transfers = await getSimpleHashNFTsTransfers(
    [...addresses],
    [...chains],
    timestamp
  )

  return transfers
}
