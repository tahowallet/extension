import { AddressOnNetwork } from "../accounts"
import { fetchWithTimeout } from "../utils/fetching"
import logger from "./logger"

export type SimpleHashNFTModel = {
  name: string
  description?: string
  token_id: string
  contractAddress: string
  chain: "polygon" | "arbitrum" | "optimism" | "ethereum"
  audio_url: string | null
  image_url: string | null
  video_url: string | null
}

type SimpleHashAPIResponse = {
  nfts: SimpleHashNFTModel[]
}

const CHAIN_ID_TO_NAME = {
  1: "ethereum",
  10: "optimism",
  137: "polygon",
  42161: "arbitrum",
}

/**
 * Get multiple addresses' NFT holdings across collections and networks
 * using the SimpleHash API.
 *
 * Note that pagination isn't supported in this wrapper, so any responses after
 * the first page will be dropped.
 *
 * Learn more at https://simplehash.readme.io/reference/nfts-by-owners
 *
 * @param address the address whose NFT holdings we want to query
 * @param network the network we're querying. Currently supports Ethereum,
 *        Polygon, Arbitrum, & Optimism.
 */
export async function getNFTs({
  address,
  network,
}: AddressOnNetwork): Promise<SimpleHashNFTModel[]> {
  // TODO err on unsupported networks
  const networkName =
    CHAIN_ID_TO_NAME[
      parseInt(network.chainID, 10) as keyof typeof CHAIN_ID_TO_NAME
    ]

  const requestURL = new URL("https://api.simplehash.com/api/v0/nfts/owners")
  requestURL.searchParams.set("chains", networkName)
  requestURL.searchParams.set("wallet_addresses", address)

  const headers = new Headers()
  headers.set("X-API-KEY", process.env.SIMPLE_HASH_API_KEY ?? "")

  try {
    // TODO validate with AJV
    const result = (await (
      await fetchWithTimeout(requestURL.toString(), {
        headers,
      })
    ).json()) as unknown as SimpleHashAPIResponse
    return result.nfts
  } catch (err) {
    logger.error("Error retrieving NFTs ", err)
  }
  return []
}
