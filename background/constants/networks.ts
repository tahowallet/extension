import { EVMNetwork, Network } from "../networks"
import { AVAX, BTC, ETH, MATIC, OPTIMISTIC_ETH, RBTC } from "./currencies"

export const ETHEREUM: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: "1",
  family: "EVM",
  coingeckoPlatformID: "ethereum",
}

export const ROOTSTOCK: EVMNetwork = {
  name: "Rootstock",
  baseAsset: RBTC,
  chainID: "30",
  family: "EVM",
  coingeckoPlatformID: "rootstock",
}

export const POLYGON: EVMNetwork = {
  name: "Polygon",
  baseAsset: MATIC,
  chainID: "137",
  family: "EVM",
  coingeckoPlatformID: "polygon-pos",
}

export const ARBITRUM_ONE: EVMNetwork = {
  name: "Arbitrum",
  baseAsset: ETH,
  chainID: "42161",
  family: "EVM",
  coingeckoPlatformID: "arbitrum-one",
}

export const AVALANCHE: EVMNetwork = {
  name: "Avalanche",
  baseAsset: AVAX,
  chainID: "43114",
  family: "EVM",
  coingeckoPlatformID: "avalanche",
}

export const OPTIMISM: EVMNetwork = {
  name: "Optimism",
  baseAsset: OPTIMISTIC_ETH,
  chainID: "10",
  family: "EVM",
  coingeckoPlatformID: "optimistic-ethereum",
}

export const GOERLI: EVMNetwork = {
  name: "Goerli",
  baseAsset: ETH,
  chainID: "5",
  family: "EVM",
  coingeckoPlatformID: "ethereum",
}

export const BITCOIN: Network = {
  name: "Bitcoin",
  baseAsset: BTC,
  family: "BTC",
  coingeckoPlatformID: "bitcoin",
}

export const FORK: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: process.env.MAINNET_FORK_CHAIN_ID ?? "1337",
  family: "EVM",
  coingeckoPlatformID: "ethereum",
}

export const EIP_1559_COMPLIANT_CHAIN_IDS = new Set(
  [ETHEREUM, POLYGON, GOERLI, AVALANCHE].map((network) => network.chainID)
)

export const CHAINS_WITH_MEMPOOL = new Set(
  [ETHEREUM, POLYGON, AVALANCHE, GOERLI].map((network) => network.chainID)
)

export const NETWORK_BY_CHAIN_ID = {
  [ETHEREUM.chainID]: ETHEREUM,
  [POLYGON.chainID]: POLYGON,
  [ROOTSTOCK.chainID]: ROOTSTOCK,
  [ARBITRUM_ONE.chainID]: ARBITRUM_ONE,
  [AVALANCHE.chainID]: AVALANCHE,
  [OPTIMISM.chainID]: OPTIMISM,
  [GOERLI.chainID]: GOERLI,
  [FORK.chainID]: FORK,
}
export const TEST_NETWORK_BY_CHAIN_ID = new Set(
  [GOERLI].map((network) => network.chainID)
)

export const NETWORK_FOR_LEDGER_SIGNING = [ETHEREUM, POLYGON]

// Networks that are not added to this struct will
// not have an in-wallet NFT tab
export const CHAIN_ID_TO_NFT_METADATA_PROVIDER: {
  [chainID: string]: ("alchemy" | "simplehash" | "poap")[]
} = {
  [ETHEREUM.chainID]: ["alchemy", "poap"],
  [POLYGON.chainID]: ["alchemy"],
  [OPTIMISM.chainID]: ["simplehash"],
  [ARBITRUM_ONE.chainID]: ["simplehash"],
  [AVALANCHE.chainID]: ["simplehash"],
}

export const NETWORKS_SUPPORTING_NFTS = new Set(
  Object.keys(CHAIN_ID_TO_NFT_METADATA_PROVIDER)
)

// Networks that are not added to this struct will
// not have an in-wallet Swap page
export const CHAIN_ID_TO_0X_API_BASE: {
  [chainID: string]: string | undefined
} = {
  [ETHEREUM.chainID]: "api.0x.org",
  [POLYGON.chainID]: "polygon.api.0x.org",
  [OPTIMISM.chainID]: "optimism.api.0x.org",
  [GOERLI.chainID]: "goerli.api.0x.org",
  [ARBITRUM_ONE.chainID]: "arbitrum.api.0x.org",
  [AVALANCHE.chainID]: "avalanche.api.0x.org",
}

export const NETWORKS_SUPPORTING_SWAPS = new Set(
  Object.keys(CHAIN_ID_TO_0X_API_BASE)
)

export const ALCHEMY_SUPPORTED_CHAIN_IDS = new Set(
  [ETHEREUM, POLYGON, ARBITRUM_ONE, OPTIMISM, GOERLI].map(
    (network) => network.chainID
  )
)

export const CHAIN_ID_TO_RPC_URLS: {
  [chainId: string]: Array<string> | undefined
} = {
  [ROOTSTOCK.chainID]: ["https://public-node.rsk.co"],
  [POLYGON.chainID]: ["https://polygon-rpc.com"],
  [OPTIMISM.chainID]: [
    "https://rpc.ankr.com/optimism",
    "https://optimism-mainnet.public.blastapi.io",
  ],
  [ETHEREUM.chainID]: ["https://rpc.ankr.com/eth"],
  [ARBITRUM_ONE.chainID]: [
    // This one is having issues with signing/other endpoints
    // "https://rpc.ankr.com/arbitrum"
  ],
  [GOERLI.chainID]: ["https://ethereum-goerli-rpc.allthatnode.com"],
  [AVALANCHE.chainID]: ["https://api.avax.network/ext/bc/C/rpc"],
}
