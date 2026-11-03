import {
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  ARBITRUM_NOVA,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  MEZO,
  MEZO_TESTNET,
  SEPOLIA,
  ZK_SYNC,
} from "./constants"
import type { AssetTransfer } from "./assets"
import { FeatureFlags, isEnabled } from "./features"
import { EVMNetwork } from "./networks"
import type { HexString } from "./types"

/**
 * Networks the transfer-log indexer covers: every built-in network that
 * serves `eth_getLogs`, which leaves out Rootstock.
 */
const INDEXED_CHAIN_IDS = [
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  ARBITRUM_NOVA,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ZK_SYNC,
  MEZO,
  MEZO_TESTNET,
  SEPOLIA,
  ARBITRUM_SEPOLIA,
].map(({ chainID }) => chainID)

export const NFT_PROVIDER_TO_CHAIN: {
  [provider in "indexer" | "poap" | "campaign"]: string[]
} = {
  poap: [ETHEREUM.chainID],
  campaign: [MEZO_TESTNET.chainID],
  indexer: INDEXED_CHAIN_IDS,
}

export const CHAIN_ID_TO_NFT_METADATA_PROVIDER = Object.entries(
  NFT_PROVIDER_TO_CHAIN,
).reduce<{ [chainID: string]: (keyof typeof NFT_PROVIDER_TO_CHAIN)[] }>(
  (byChain, [provider, chainIDs]) => {
    chainIDs.forEach((chainID) => {
      byChain[chainID] ??= []
      byChain[chainID].push(provider as keyof typeof NFT_PROVIDER_TO_CHAIN)
    })
    return byChain
  },
  {},
)

/** Networks that had an NFT tab before the indexer, when SimpleHash served them. */
const PRE_INDEXER_NFT_TAB_CHAIN_IDS = [
  ETHEREUM,
  POLYGON,
  OPTIMISM,
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ZK_SYNC,
].map(({ chainID }) => chainID)

/**
 * Networks with an in-wallet NFT tab: those POAPs or campaigns cover, plus
 * the indexer's while its flag is on, or the tabs as they were while it's off.
 */
export const NETWORKS_SUPPORTING_NFTS = new Set([
  ...NFT_PROVIDER_TO_CHAIN.poap,
  ...NFT_PROVIDER_TO_CHAIN.campaign,
  ...(isEnabled(FeatureFlags.SUPPORT_NFT_INDEXER)
    ? NFT_PROVIDER_TO_CHAIN.indexer
    : PRE_INDEXER_NFT_TAB_CHAIN_IDS),
])

export type NFTsWithPagesResponse = {
  nfts: NFT[]
  /** The cursor of the next page, if there is one. */
  nextPage: string | null
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
  /**
   * The first block that was actually scanned, if a lookup covered less than
   * the range it was asked for. Callers should treat blocks before this one as
   * not yet scanned, and look them up on a later pass.
   */
  coveredFromBlock?: number
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
