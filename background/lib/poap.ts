import logger from "./logger"
import { AddressOnNetwork } from "../accounts"
import { fetchWithTimeout } from "../utils/fetching"

export type PoapNFTModel = {
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
}

/**
 * Returns list of POAPs for a given address. Doesn't take into account the network as
 * most of the POAPs are on the Gnosis chain, small % on Ethereum mainnet. This function should
 * return all POAPs, regardeless of the chain.
 *
 * More information: https://documentation.poap.tech/reference/getactionsscan-5
 *
 * @param address address of account that holds POAPs
 * @returns
 */
export async function getNFTs({
  address,
}: AddressOnNetwork): Promise<PoapNFTModel[]> {
  const requestURL = new URL(`https://api.poap.tech/actions/scan/${address}`)
  const headers = new Headers()
  headers.set("X-API-KEY", process.env.POAP_API_KEY ?? "")

  try {
    const result = (await (
      await fetchWithTimeout(requestURL.toString(), {
        headers,
      })
    ).json()) as unknown as PoapNFTModel[]
    return result
  } catch (err) {
    logger.error("Errr retrieving NFTs", err)
  }

  return []
}
