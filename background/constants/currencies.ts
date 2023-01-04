import { FiatCurrency } from "../assets"
import { NetworkBaseAsset } from "../networks"

export const USD: FiatCurrency = {
  name: "United States Dollar",
  symbol: "USD",
  decimals: 10,
}

export const FIAT_CURRENCIES = [USD]
export const FIAT_CURRENCIES_SYMBOL = FIAT_CURRENCIES.map(
  (currency) => currency.symbol
)

export const ETH: NetworkBaseAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
}

export const RBTC: NetworkBaseAsset = {
  name: "RSK Token",
  symbol: "RBTC",
  decimals: 18,
}

export const OPTIMISTIC_ETH: NetworkBaseAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
}

export const MATIC: NetworkBaseAsset = {
  name: "Matic Token",
  symbol: "MATIC",
  decimals: 18,
}

export const AVAX: NetworkBaseAsset = {
  name: "Avalanche",
  symbol: "AVAX",
  decimals: 18,
}

export const BNB: NetworkBaseAsset = {
  name: "Binance Coin",
  symbol: "BNB",
  decimals: 18,
}

export const BTC: NetworkBaseAsset = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
}

export const BASE_ASSETS = [ETH, BTC, MATIC, RBTC, OPTIMISTIC_ETH, AVAX, BNB]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce<{
  [assetSymbol: string]: NetworkBaseAsset
}>((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
