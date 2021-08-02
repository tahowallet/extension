import { Network } from "../types"
import { BTC, ETH } from "./currencies"

// TODO integrate this with /api/networks

export const ETHEREUM = {
  name: "Ethereum Main Net",
  baseAsset: ETH,
  chainId: "1",
  family: "EVM",
} as Network

export const BITCOIN = {
  name: "Bitcoin",
  baseAsset: BTC,
  family: "BTC",
} as Network

export const NETWORKS = [ETHEREUM, BITCOIN]
