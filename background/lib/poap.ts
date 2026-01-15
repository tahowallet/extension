import { fetchJson } from "@ethersproject/web"
import logger from "./logger"
import { ETHEREUM } from "../constants"
import { NFT, NFTCollection, NFTsWithPagesResponse } from "../nfts"

export const POAP_CONTRACT = "0x22C1f6050E56d2876009903609a2cC3fEf83B415" // POAP contract address https://etherscan.io/address/0x22C1f6050E56d2876009903609a2cC3fEf83B415
export const POAP_COLLECTION_ID = "POAP"

type PoapNFTModel = {
  event: {
    id: number
    fancy_id: string
    name: string
    event_url: string
    image_url: string
    country: string
    city: string
    description: string
    year: number
    start_date: string
    end_date: string
    expiry_date: string
    supply: number
  }
  tokenId: string
  owner: string
  chain: string
  created: string
}

function poapNFTModelToNFT(original: PoapNFTModel, owner: string): NFT {
  const {
    tokenId,
    created,
    event: {
      name: eventName,
      image_url: thumbnail,
      description,
      country,
      city,
      year,
      supply,
    },
  } = original
  return {
    id: tokenId,
    tokenId,
    name: eventName,
    description,
    thumbnailURL: thumbnail,
    transferDate: created,
    attributes: [
      { trait: "Event", value: eventName },
      { trait: "Country", value: country },
      { trait: "City", value: city },
      { trait: "Year", value: year?.toString() },
    ],
    collectionID: POAP_COLLECTION_ID,
    contract: POAP_CONTRACT, // contract address doesn't make sense for POAPs
    owner,
    network: ETHEREUM,
    supply,
    isBadge: true,
    rarity: {}, // no rarity rankings for POAPs
  }
}

/**
 * Returns list of POAPs for a given address. Doesn't take into account the network as
 * most of the POAPs are on the Gnosis chain, small % on Ethereum mainnet. This function should
 * return all POAPs, regardless of the chain.
 *
 * More information: https://documentation.poap.tech/reference/getactionsscan-5
 *
 * @param address address of account that holds POAPs
 * @returns
 */
export async function getPoapNFTs(
  address: string,
): Promise<NFTsWithPagesResponse> {
  const requestURL = new URL(`https://api.poap.tech/actions/scan/${address}`)

  try {
    const result: PoapNFTModel[] = await fetchJson({
      url: requestURL.toString(),
      headers: {
        "X-API-KEY": process.env.POAP_API_KEY ?? "",
      },
    })

    return {
      nfts: result.map((nft) => poapNFTModelToNFT(nft, address)),
      nextPageURL: null,
    }
  } catch (err) {
    logger.error("Errr retrieving NFTs", err)
  }

  return { nfts: [], nextPageURL: null }
}

export async function getPoapCollections(
  address: string,
): Promise<NFTCollection> {
  return {
    id: POAP_COLLECTION_ID, // let's keep POAPs in one collection
    name: POAP_COLLECTION_ID,
    nftCount: undefined, // TODO: we don't know at this point how many POAPs this address has
    owner: address,
    hasBadges: true,
    network: ETHEREUM,
    floorPrice: undefined, // POAPs don't have floor prices
    thumbnailURL: "images/poap_logo.svg",
  }
}
