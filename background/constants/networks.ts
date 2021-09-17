import { EVMNetwork, Network } from "../types"
import { BTC, ETH } from "./currencies"

// TODO integrate this with /api/networks

export const ETHEREUM: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: "1",
  family: "EVM",
}

export const BITCOIN: Network = {
  name: "Bitcoin",
  baseAsset: BTC,
  family: "BTC",
}

export const NETWORKS = [ETHEREUM, BITCOIN]
