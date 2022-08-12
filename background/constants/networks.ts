import { EVMNetwork, Network } from "../networks"
import { BTC, ETH, MATIC } from "./currencies"

export const ETHEREUM: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: "1",
  family: "EVM",
}

export const POLYGON: EVMNetwork = {
  name: "Polygon",
  baseAsset: MATIC,
  chainID: "137",
  family: "EVM",
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
  baseAsset: ETH,
  chainID: "10",
  family: "EVM",
  coingeckoPlatformID: "optimistic-ethereum",
}

export const ROPSTEN: EVMNetwork = {
  name: "Ropsten",
  baseAsset: ETH,
  chainID: "3",
  family: "EVM",
}

export const RINKEBY: EVMNetwork = {
  name: "Rinkeby",
  baseAsset: ETH,
  chainID: "4",
  family: "EVM",
}

export const GOERLI: EVMNetwork = {
  name: "Goerli",
  baseAsset: ETH,
  chainID: "5",
  family: "EVM",
}

export const KOVAN: EVMNetwork = {
  name: "Kovan",
  baseAsset: ETH,
  chainID: "42",
  family: "EVM",
}

export const BITCOIN: Network = {
  name: "Bitcoin",
  baseAsset: BTC,
  family: "BTC",
}

export const FORK: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: process.env.MAINNET_FORK_CHAIN_ID ?? "1337",
  family: "EVM",
  coingeckoPlatformID: "ethereum",
}

export const NETWORK_BY_CHAIN_ID = {
  [ETHEREUM.chainID]: ETHEREUM,
  [POLYGON.chainID]: POLYGON,
  [ARBITRUM_ONE.chainID]: ARBITRUM_ONE,
  [OPTIMISM.chainID]: OPTIMISM,
  [ROPSTEN.chainID]: ROPSTEN,
  [RINKEBY.chainID]: RINKEBY,
  [GOERLI.chainID]: GOERLI,
  [KOVAN.chainID]: KOVAN,
  [FORK.chainID]: FORK,
}
