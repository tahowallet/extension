import { NetworkDefaultBaseAsset } from "../networks"

const ETH: NetworkDefaultBaseAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
}

const RBTC: NetworkDefaultBaseAsset = {
  name: "RSK Token",
  symbol: "RBTC",
  decimals: 18,
}

const OPTIMISTIC_ETH: NetworkDefaultBaseAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
}

const MATIC: NetworkDefaultBaseAsset = {
  name: "Matic Token",
  symbol: "MATIC",
  decimals: 18,
}

const AVAX: NetworkDefaultBaseAsset = {
  name: "Avalanche",
  symbol: "AVAX",
  decimals: 18,
}

const BNB: NetworkDefaultBaseAsset = {
  name: "Binance Coin",
  symbol: "BNB",
  decimals: 18,
}

const BTC: NetworkDefaultBaseAsset = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
}

export const DEFAULT_BASE_ASSETS = [
  ETH,
  BTC,
  MATIC,
  RBTC,
  OPTIMISTIC_ETH,
  AVAX,
  BNB,
]

const SYMBOLS = DEFAULT_BASE_ASSETS.map(({ symbol }) => symbol)
type BaseAssetSymbol = typeof SYMBOLS[number]

export const DEFAULT_BASE_ASSETS_BY_SYMBOL = DEFAULT_BASE_ASSETS.reduce(
  (sum, asset) => ({ ...sum, [asset.symbol]: asset }),
  {}
) as { [key in BaseAssetSymbol]: NetworkDefaultBaseAsset }
