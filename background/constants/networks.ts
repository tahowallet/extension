import { EVMNetwork, Network } from "../networks"
import { BTC, ETH, MATIC, OPTIMISTIC_ETH, RBTC } from "./currencies"

export const ETHEREUM: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: "1",
  family: "EVM",
  coingeckoPlatformID: "ethereum",
}

export const RSK: EVMNetwork = {
  name: "RSK",
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
  [ETHEREUM, POLYGON, GOERLI].map((network) => network.chainID)
)

export const CHAINS_WITH_MEMPOOL = new Set(
  [ETHEREUM, POLYGON, GOERLI].map((network) => network.chainID)
)

export const NETWORK_BY_CHAIN_ID = {
  [ETHEREUM.chainID]: ETHEREUM,
  [POLYGON.chainID]: POLYGON,
  [RSK.chainID]: RSK,
  [ARBITRUM_ONE.chainID]: ARBITRUM_ONE,
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
export const CHAIN_ID_TO_NFT_METADATA_PROVIDER = {
  [ETHEREUM.chainID]: "alchemy" as const,
  [POLYGON.chainID]: "alchemy" as const,
  [OPTIMISM.chainID]: "simplehash" as const,
  [ARBITRUM_ONE.chainID]: "simplehash" as const,
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
  [RSK.chainID]: ["https://public-node.rsk.co"],
  [POLYGON.chainID]: ["https://polygon-rpc.com"],
  [OPTIMISM.chainID]: [
    "https://rpc.ankr.com/optimism",
    "https://optimism-mainnet.public.blastapi.io",
  ],
  [ETHEREUM.chainID]: ["https://rpc.ankr.com/eth"],
  // @TODO Figure out why calling multicall with more than 1 argument returns
  // {
  //   jsonrpc: "2.0",
  //   error: { code: 0, message: "we can't execute this request" },
  // }
  // [ARBITRUM_ONE.chainID]: ["https://rpc.ankr.com/arbitrum"],
  [GOERLI.chainID]: ["https://ethereum-goerli-rpc.allthatnode.com"],
}
