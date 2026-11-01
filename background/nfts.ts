import {
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ZK_SYNC,
  MEZO_TESTNET,
} from "./constants"
import type { AssetTransfer } from "./assets"
import { EVMNetwork } from "./networks"
import type { HexString } from "./types"
// Networks that are not added to this struct will
// not have an in-wallet NFT tab
export const CHAIN_ID_TO_NFT_METADATA_PROVIDER: {
  [chainID: string]: ("simplehash" | "poap" | "campaign")[]
} = {
  [ETHEREUM.chainID]: ["simplehash", "poap"],
  [POLYGON.chainID]: ["simplehash"],
  [OPTIMISM.chainID]: ["simplehash"],
  [ARBITRUM_ONE.chainID]: ["simplehash"],
  [AVALANCHE.chainID]: ["simplehash"],
  [BINANCE_SMART_CHAIN.chainID]: ["simplehash"],
  [ZK_SYNC.chainID]: ["simplehash"],
  [MEZO_TESTNET.chainID]: ["campaign"],
}

export const NFT_PROVIDER_TO_CHAIN = {
  poap: [ETHEREUM.chainID],
  campaign: [MEZO_TESTNET.chainID],
  simplehash: [
    ETHEREUM.chainID,
    POLYGON.chainID,
    OPTIMISM.chainID,
    ARBITRUM_ONE.chainID,
    AVALANCHE.chainID,
    BINANCE_SMART_CHAIN.chainID,
    ZK_SYNC.chainID,
  ],
}

export const NETWORKS_SUPPORTING_NFTS = new Set(
  Object.keys(CHAIN_ID_TO_NFT_METADATA_PROVIDER),
)

export type NFTsWithPagesResponse = {
  nfts: NFT[]
  nextPageURL: string | null
}

export type NFT = {
  id: string
  tokenId: string
  collectionID: string
  name: string
  description: string
  thumbnailURL?: string
  previewURL?: string
  transferDate?: string
  attributes: { trait: string; value: string }[]
  rarity: {
    rank?: number
    score?: number
    uniqueAttributes?: number
  }
  contract: string
  owner: string
  network: EVMNetwork
  supply?: number // only for POAPs
  isBadge: boolean // POAPs, Galxe NFTs and OATs
}

export type NFTCollection = {
  id: string
  name: string
  owner: string
  network: EVMNetwork
  hasBadges: boolean
  thumbnailURL?: string
  nftCount?: number
  totalNftCount?: number
  floorPrice?: {
    value: bigint
    token: {
      name: string
      symbol: string
      decimals: number
    }
  }
}

/** An ERC-721 token moving between two addresses, as its log recorded it. */
export type ERC721Transfer = {
  network: EVMNetwork
  contractAddress: HexString
  /** The token ID in decimal. */
  tokenId: string
  from: HexString
  to: HexString
  txHash: HexString
  blockNumber: number
  logIndex: number
}

/** What one scan of an account's blocks found. */
export type ScannedTransfers = {
  assetTransfers: AssetTransfer[]
  nftTransfers: ERC721Transfer[]
}

export type TransferredNFT = {
  id: string
  chainID: string
  from: string | null
  to: string | null
  isKnownFromAddress: boolean
  isKnownToAddress: boolean
  collectionID: string | null
}
