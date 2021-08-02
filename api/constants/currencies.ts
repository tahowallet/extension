import { FiatCurrency, FungibleAsset } from "../types"

export const USD = {
  name: "United States Dollar",
  symbol: "USD",
  decimals: 10,
} as FiatCurrency

export const EUR = {
  name: "euro",
  symbol: "EUR",
  decimals: 10,
} as FiatCurrency

export const CNY = {
  name: "renminbi",
  symbol: "CNY",
  decimals: 10,
} as FiatCurrency

export const FIAT_CURRENCIES = [USD, EUR, CNY]

export const ETH = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
  metadata: {
    coingeckoId: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
} as FungibleAsset

export const BTC = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
  metadata: {
    coingeckoId: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
} as FungibleAsset

export const BASE_ASSETS = [ETH, BTC]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
