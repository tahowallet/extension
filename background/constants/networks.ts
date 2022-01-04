import { EVMNetwork, Network } from "../networks"
import { BTC, ETH } from "./currencies"

// TODO integrate this with /api/networks

export const ETHEREUM: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: "1",
  family: "EVM",
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

export const EVM_NETWORKS: EVMNetwork[] = [
  ETHEREUM,
  ROPSTEN,
  RINKEBY,
  GOERLI,
  KOVAN,
]

export const EVM_NETWORKS_BY_CHAIN_ID: { [chainID: string]: EVMNetwork } =
  EVM_NETWORKS.reduce(
    (agg, network) => ({
      ...agg,
      [network.chainID]: network,
    }),
    {}
  )

export const NETWORKS = [ETHEREUM, ROPSTEN, RINKEBY, GOERLI, KOVAN, BITCOIN]
