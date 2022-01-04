import { Contract } from "ethers"
import { BaseProvider } from "@ethersproject/providers"
import { fetchJson } from "@ethersproject/web"

import logger from "./logger"
import { HexString, URI } from "../types"
import { JTDDataType, ValidateFunction } from "ajv/dist/jtd"

const abi = [
  "function tokenURI(uint256 _tokenId) external view returns (string)",
]

/**
 * Given an ERC-721 metadata-compliant token contract address and a token ID,
 * return the specific token's URI.
 */
export async function getTokenURI(
  provider: BaseProvider,
  tokenAddress: HexString,
  tokenID: bigint
): Promise<URI | undefined> {
  const tokenContract = new Contract(tokenAddress, abi).connect(provider)
  return tokenContract.tokenURI(tokenID)
}

// JSON Type Definition for the ERC-721 Metadata Extension
// https://eips.ethereum.org/EIPS/eip-721
const metadataJTD = {
  optionalProperties: {
    name: { type: "string" },
    description: { type: "string" },
    image: { type: "string" },
    title: { type: "string" }, // not found in 721, but seen in the wild
    external_url: { type: "string" }, // not found in 721, but seen in the wild
  },
  additionalProperties: true,
} as const

const isValidMetadata: ValidateFunction<JTDDataType<typeof metadataJTD>> = require("./validate/jtd-validators.js")["erc721-metadata.jtd.schema.json"]

export interface ERC721Metadata {
  name: string | undefined
  description: string | undefined
  image: URI | undefined
}

/**
 * Given a compliant token contract address and token ID, retrieve and parse the
 * ERC-721 metadata.
 */
export async function getTokenMetadata(
  provider: BaseProvider,
  tokenAddress: HexString,
  tokenID: bigint
): Promise<ERC721Metadata | undefined> {
  const uri = await getTokenURI(provider, tokenAddress, tokenID)
  if (uri) {
    const jsonResponse = await fetchJson(uri)

    if (isValidMetadata(jsonResponse)) {
      return {
        name: jsonResponse.name,
        description: jsonResponse.description,
        image: jsonResponse.image,
      }
    }

    logger.warn("Invalid ERC-721 metadata", tokenAddress, tokenID, jsonResponse)
  } else {
    logger.warn(
      "No token URI was found, perhaps this isn't an ERC-721 metadata-compliant NFT?",
      tokenAddress,
      tokenID
    )
  }
  return undefined
}
