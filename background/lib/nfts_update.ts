import { AddressOnNetwork } from "../accounts"
import {
  getNFTs as simpleHashGetNFTs,
  getCollections as simpleHashGetCollections,
} from "./simple-hash_update"
import {
  getNFTs as poapGetNFTs,
  getCollections as poapGetCollections,
} from "./poap_update"
import {
  NFT,
  CHAIN_ID_TO_NFT_METADATA_PROVIDER,
  NFT_PROVIDER_TO_CHAIN,
  NFTCollection,
} from "../nfts"

function groupChainsByAddress(accounts: AddressOnNetwork[]) {
  return accounts.reduce((result, account) => {
    const {
      address,
      network: { chainID },
    } = account
    if (CHAIN_ID_TO_NFT_METADATA_PROVIDER[chainID]) {
      result[address] ??= [] // eslint-disable-line no-param-reassign
      result[address].push(chainID)
    }
    return result
  }, {} as { [address: string]: string[] })
}

export function getNFTs(
  accounts: AddressOnNetwork[],
  collections: string[]
): Promise<{ nfts: NFT[]; nextPageURLs: string[] }>[] {
  const chainIDsByAddress = groupChainsByAddress(accounts)

  return Object.entries(chainIDsByAddress).flatMap(
    async ([address, chainIDs]) => {
      const nfts: NFT[] = []
      const nextPageURLs: string[] = []

      if (
        chainIDs.filter((chainID) =>
          NFT_PROVIDER_TO_CHAIN.poap.includes(chainID)
        ).length
      ) {
        const { nfts: poapNFTs } = await poapGetNFTs(address)
        nfts.push(...poapNFTs)
      }

      const simpleHashChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.simplehash.includes(chainID)
      )

      if (simpleHashChains.length) {
        await Promise.all(
          collections.map(async (collectionID) => {
            const { nfts: simpleHashNFTs, nextPageURL } =
              await simpleHashGetNFTs(address, collectionID, simpleHashChains)

            nfts.push(...simpleHashNFTs)

            if (nextPageURL) nextPageURLs.push(nextPageURL)
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
      if (
        chainIDs.filter((chainID) =>
          NFT_PROVIDER_TO_CHAIN.poap.includes(chainID)
        ).length
      ) {
        collections.push(await poapGetCollections(address))
      }

      const simpleHashChains = chainIDs.filter((chainID) =>
        NFT_PROVIDER_TO_CHAIN.simplehash.includes(chainID)
      )

      if (simpleHashChains.length) {
        collections.push(...(await simpleHashGetCollections(address, chainIDs)))
      }

      return collections
    }
  )
}
