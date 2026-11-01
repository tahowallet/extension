import { BigNumber, Contract, ethers } from "ethers"
import { BaseProvider } from "@ethersproject/providers"
import { fetchJson } from "@ethersproject/web"
import { EventFragment, FunctionFragment } from "ethers/lib/utils"

import logger from "./logger"
import type { HexString, URI } from "../types"
import type { EVMNetwork } from "../networks"
import type { ERC721Transfer } from "../nfts"
import { isValidMetadata } from "./validate"

export const ERC721_FUNCTIONS = {
  name: FunctionFragment.from("name() view returns (string)"),
  symbol: FunctionFragment.from("symbol() view returns (string)"),
  ownerOf: FunctionFragment.from(
    "ownerOf(uint256 tokenId) view returns (address)",
  ),
  tokenURI: FunctionFragment.from(
    "tokenURI(uint256 tokenId) view returns (string)",
  ),
  supportsInterface: FunctionFragment.from(
    "supportsInterface(bytes4 interfaceId) view returns (bool)",
  ),
}

const ERC721_EVENTS = {
  Transfer: EventFragment.from(
    "Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ),
}

export const ERC721_INTERFACE = new ethers.utils.Interface([
  ...Object.values(ERC721_FUNCTIONS),
  ...Object.values(ERC721_EVENTS),
])

/** The ERC-165 interface ID of ERC-721. */
export const ERC721_INTERFACE_ID = "0x80ac58cd"

/**
 * The topic hash of ERC-721 `Transfer`, which is also ERC-20's; ERC-721 logs
 * carry a fourth topic, the token ID.
 */
export const ERC721_TRANSFER_TOPIC = ERC721_INTERFACE.getEventTopic("Transfer")

/** The fields of a log that {@link parseERC721TransferLog} reads. */
export type ERC721TransferLogFields = {
  address: HexString
  topics: HexString[]
  transactionHash: HexString
  blockNumber: number
  logIndex: number
}

/**
 * Parses a log as an ERC-721 `Transfer`, or returns `undefined` if it has
 * another topic hash or other than four topics.
 */
export function parseERC721TransferLog(
  log: ERC721TransferLogFields,
  network: EVMNetwork,
): ERC721Transfer | undefined {
  const { address, topics, transactionHash, blockNumber, logIndex } = log
  if (
    topics.length !== 4 ||
    topics[0].toLowerCase() !== ERC721_TRANSFER_TOPIC
  ) {
    return undefined
  }

  try {
    const decoded = ERC721_INTERFACE.decodeEventLog(
      ERC721_EVENTS.Transfer,
      "0x",
      topics,
    )
    return {
      network,
      contractAddress: address,
      tokenId: (decoded.tokenId as BigNumber).toString(),
      from: decoded.from,
      to: decoded.to,
      txHash: transactionHash,
      blockNumber,
      logIndex,
    }
  } catch (_err) {
    return undefined
  }
}

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
  tokenID: bigint,
): Promise<URI | undefined> {
  const tokenContract = new Contract(tokenAddress, abi).connect(provider)
  return tokenContract.tokenURI(tokenID)
}

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
  tokenID: bigint,
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
      tokenID,
    )
  }
  return undefined
}
