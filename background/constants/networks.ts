import { EVMNetwork, Network } from "../networks"
import { AVAX, BNB, BTC, ETH, MATIC, OPTIMISTIC_ETH, RBTC } from "./currencies"

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

export const BINANCE_SMART_CHAIN: EVMNetwork = {
  name: "BNB Chain",
  baseAsset: BNB,
  chainID: "56",
  family: "EVM",
  coingeckoPlatformID: "binance-smart-chain",
}

export const ARBITRUM_NOVA: EVMNetwork = {
  name: "Arbitrum Nova",
  baseAsset: ETH,
  chainID: "42170",
  family: "EVM",
  coingeckoPlatformID: "arbitrum-nova",
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
  [ETHEREUM, POLYGON, AVALANCHE, GOERLI, BINANCE_SMART_CHAIN].map(
    (network) => network.chainID
  )
)

export const NETWORK_BY_CHAIN_ID = {
  [ETHEREUM.chainID]: ETHEREUM,
  [POLYGON.chainID]: POLYGON,
  [ROOTSTOCK.chainID]: ROOTSTOCK,
  [ARBITRUM_ONE.chainID]: ARBITRUM_ONE,
  [AVALANCHE.chainID]: AVALANCHE,
  [ARBITRUM_NOVA.chainID]: ARBITRUM_NOVA,
  [OPTIMISM.chainID]: OPTIMISM,
  [BINANCE_SMART_CHAIN.chainID]: BINANCE_SMART_CHAIN,
  [GOERLI.chainID]: GOERLI,
  [FORK.chainID]: FORK,
}
export const TEST_NETWORK_BY_CHAIN_ID = new Set(
  [GOERLI].map((network) => network.chainID)
)

export const NETWORK_FOR_LEDGER_SIGNING = [ETHEREUM, POLYGON]

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
  [BINANCE_SMART_CHAIN.chainID]: "bsc.api.0x.org",
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
  [POLYGON.chainID]: ["https://polygon-rpc.com", "https://1rpc.io/matic"],
  [OPTIMISM.chainID]: [
    "https://rpc.ankr.com/optimism",
    "https://1rpc.io/op",
    "https://optimism-mainnet.public.blastapi.io",
  ],
  [ETHEREUM.chainID]: ["https://rpc.ankr.com/eth", "https://1rpc.io/eth"],
  [ARBITRUM_ONE.chainID]: [
    "https://rpc.ankr.com/arbitrum",
    "https://1rpc.io/arb",
  ],
  [ARBITRUM_NOVA.chainID]: ["https://nova.arbitrum.io/rpc	"],
  [GOERLI.chainID]: ["https://ethereum-goerli-rpc.allthatnode.com"],
  [AVALANCHE.chainID]: [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://1rpc.io/avax/c",
    "https://rpc.ankr.com/avalanche",
  ],
  [BINANCE_SMART_CHAIN.chainID]: [
    "https://rpc.ankr.com/bsc",
    "https://bsc-dataseed.binance.org",
  ],
}

/**
 * Method list, to describe which rpc method calls on which networks should
 * prefer alchemy provider over the generic ones.
 *
 * The method names can be full or the starting parts of the method name.
 * This allows us to use "namespaces" for providers eg `alchemy_...` or `qn_...`
 *
 * The structure is network specific with an extra `everyChain` option.
 * The methods in this array will be directed towards alchemy on every network.
 */
export const RPC_METHOD_PROVIDER_ROUTING = {
  everyChain: [
    "alchemy_", // alchemy specific api calls start with this
    "eth_sendRawTransaction", // broadcast should always go to alchemy
    "eth_subscribe", // generic http providers do not support this, but dapps need this
    "eth_estimateGas", // just want to be safe, when setting up a transaction
  ],
  [OPTIMISM.chainID]: [
    "eth_call", // this is causing issues on optimism with ankr and is used heavily by uniswap
  ],
  [ARBITRUM_ONE.chainID]: [
    "eth_call", // this is causing issues on arbitrum with ankr and is used heavily by uniswap
  ],
} as const

export const CHAIN_ID_TO_OPENSEA_CHAIN = {
  [ETHEREUM.chainID]: "ethereum",
  [OPTIMISM.chainID]: "optimism",
  [POLYGON.chainID]: "matic",
  [ARBITRUM_ONE.chainID]: "arbitrum",
  [AVALANCHE.chainID]: "avalanche",
  [BINANCE_SMART_CHAIN.chainID]: "bsc",
}
