import { fetchJson } from "@ethersproject/web"
import { NETWORK_BY_CHAIN_ID } from "../constants"
import { NFT, NFTCollection, NFTsWithPagesResponse } from "../nfts"
import { HexString } from "../types"
import logger from "./logger"
import { sameEVMAddress } from "./utils"

type SimpleHashNFTModel = {
  nft_id: string
  token_id: string
  name: string
  description?: string
  contract_address: string
  chain: "polygon" | "arbitrum" | "optimism" | "ethereum"
  external_url?: string
  image_url: string | null
  previews?: {
    image_small_url?: string
    image_medium_url?: string
    image_large_url?: string
  }
  collection: {
    collection_id: string
    name: string
    floor_prices: {
      value: bigint
      payment_token: {
        name: string
        symbol: string
      }
    }[]
  }
  owners: { owner_address: string; last_acquired_date: string }[]
  extra_metadata?: {
    attributes?: [{ trait_type: string; value: string }]
  }
}

type SimpleHashCollectionModel = {
  id: string
  name: string
  image_url: string
  chain: "polygon" | "arbitrum" | "optimism" | "ethereum"
  distinct_nfts_owned: number
  distinct_owner_count: number
  distinct_nft_count: number
  total_quantity: number
  floor_prices: {
    value: bigint
    payment_token: {
      name: string
      symbol: string
    }
  }[]
}

type SimpleHashNFTsByWalletAPIResponse = {
  next: string | null
  nfts: SimpleHashNFTModel[]
}

type SimpleHashCollectionsByWalletAPIResponse = {
  collections: SimpleHashCollectionModel[]
}

const CHAIN_ID_TO_NAME = {
  1: "ethereum",
  10: "optimism",
  137: "polygon",
  42161: "arbitrum",
}

const SIMPLE_HASH_CHAIN_TO_ID = {
  ethereum: 1,
  optimism: 10,
  polygon: 137,
  arbitrum: 42161,
}

function isGalxeAchievement(url: string | null | undefined) {
  return !!url && (url.includes("galaxy.eco") || url.includes("galxe.com"))
}

function getChainIDsNames(chainIDs: string[]) {
  return chainIDs
    .map(
      (chainID) =>
        CHAIN_ID_TO_NAME[parseInt(chainID, 10) as keyof typeof CHAIN_ID_TO_NAME]
    )
    .join(",")
}

function simpleHashCollectionModelToCollection(
  original: SimpleHashCollectionModel,
  owner: HexString
): NFTCollection {
  const {
    id,
    name,
    chain,
    distinct_nfts_owned: nftCount,
    floor_prices: collectionPrices,
    image_url: thumbnail,
  } = original
  const floorPrice = collectionPrices
    ?.map(({ value, payment_token }) => ({
      value,
      token: {
        name: payment_token.name,
        symbol: payment_token.symbol,
      },
    }))
    .sort((price1, price2) => Number(price1.value - price2.value))[0]
  const chainID = SIMPLE_HASH_CHAIN_TO_ID[chain]

  return {
    id,
    name,
    nftCount,
    owner,
    thumbnail,
    network: NETWORK_BY_CHAIN_ID[chainID],
    floorPrice,
  }
}

function simpleHashNFTModelToNFT(
  original: SimpleHashNFTModel,
  owner: HexString
): NFT {
  const {
    nft_id: nftID,
    name,
    description,
    contract_address: contractAddress,
    chain,
    image_url: previewURL,
    previews,
    owners = [],
    external_url: nftURL = "",
    collection: { collection_id: collectionID },
    extra_metadata: metadata,
  } = original

  const isAchievement = isGalxeAchievement(nftURL)

  const thumbnail =
    previewURL ||
    previews?.image_large_url ||
    previews?.image_medium_url ||
    previews?.image_small_url
  const chainID = SIMPLE_HASH_CHAIN_TO_ID[chain]

  const transferDate = owners.find(({ owner_address }) =>
    sameEVMAddress(owner_address, owner)
  )?.last_acquired_date

  const attributes =
    metadata?.attributes?.map(({ trait_type, value }) => ({
      value,
      trait: trait_type,
    })) ?? []

  return {
    id: nftID,
    name,
    description,
    thumbnail,
    transferDate,
    attributes,
    collectionID,
    contract: contractAddress,
    owner,
    network: NETWORK_BY_CHAIN_ID[chainID],
    achievement: isAchievement ? { url: nftURL } : null,
  }
}

/**
 * Get NFT holdings of given address across collections and networks
 * using the SimpleHash API.
 *
 * Learn more at https://simplehash.readme.io/reference/nfts-by-owners
 *
 * @param address address whose NFT holdings we want to query
 * @param collectionID collections we are updating
 * @param chainIDs the networks we're querying
 */
export async function getSimpleHashNFTs(
  address: string,
  collectionID: string,
  chainIDs: string[]
): Promise<NFTsWithPagesResponse> {
  const requestURL = new URL("https://api.simplehash.com/api/v0/nfts/owners")
  requestURL.searchParams.set("chains", getChainIDsNames(chainIDs))
  requestURL.searchParams.set("wallet_addresses", address)
  requestURL.searchParams.set("collection_id", collectionID)

  try {
    const result: SimpleHashNFTsByWalletAPIResponse = await fetchJson({
      url: requestURL.toString(),
      headers: {
        "X-API-KEY": process.env.SIMPLE_HASH_API_KEY ?? "",
      },
    })

    return {
      nfts:
        result.nfts
          .filter((nft) => !!nft.nft_id)
          .map((nft) => simpleHashNFTModelToNFT(nft, address)) ?? [],
      nextPageURL: result.next,
    }
  } catch (err) {
    logger.error("Error retrieving NFTs ", err)
  }

  return { nfts: [], nextPageURL: null }
}

/**
 * Get NFT Collections of given address and networks using the SimpleHash API.
 * This will return an overview of collections that address holds.
 *
 * Learn more at https://simplehash.readme.io/reference/collections-by-wallets
 *
 * @param address address whose NFT Collections we want to query
 * @param chainIDs the networks we're querying
 */
export async function getSimpleHashCollections(
  address: string,
  chainIDs: string[]
): Promise<NFTCollection[]> {
  const requestURL = new URL(
    "https://api.simplehash.com/api/v0/nfts/collections_by_wallets"
  )
  requestURL.searchParams.set("chains", getChainIDsNames(chainIDs))
  requestURL.searchParams.set("wallet_addresses", address)

  try {
    const result: SimpleHashCollectionsByWalletAPIResponse = await fetchJson({
      url: requestURL.toString(),
      headers: {
        "X-API-KEY": process.env.SIMPLE_HASH_API_KEY ?? "",
      },
    })

    return result.collections
      .filter((collection) => collection.id)
      .map((collection) =>
        simpleHashCollectionModelToCollection(collection, address)
      )
  } catch (err) {
    logger.error("Error retrieving NFTs ", err)
  }

  return []
}
