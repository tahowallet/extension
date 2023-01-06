import { NetworkBaseAsset } from "../networks"

const ETH: NetworkBaseAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
}

const RBTC: NetworkBaseAsset = {
  name: "RSK Token",
  symbol: "RBTC",
  decimals: 18,
}

const MATIC: NetworkBaseAsset = {
  name: "Matic Token",
  symbol: "MATIC",
  decimals: 18,
}

const AVAX: NetworkBaseAsset = {
  name: "Avalanche",
  symbol: "AVAX",
  decimals: 18,
}

const BNB: NetworkBaseAsset = {
  name: "Binance Coin",
  symbol: "BNB",
  decimals: 18,
}

const BTC: NetworkBaseAsset = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
}

export const BASE_ASSETS = [ETH, BTC, MATIC, RBTC, AVAX, BNB]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce<{
  [assetSymbol: string]: NetworkBaseAsset
}>((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
