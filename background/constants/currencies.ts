import { FiatCurrency, FungibleAsset, CoinGeckoAsset } from "../assets"

export const USD: FiatCurrency = {
  name: "United States Dollar",
  symbol: "USD",
  decimals: 10,
}

export const EUR: FiatCurrency = {
  name: "euro",
  symbol: "EUR",
  decimals: 10,
}

export const CNY: FiatCurrency = {
  name: "renminbi",
  symbol: "CNY",
  decimals: 10,
}

export const FIAT_CURRENCIES = [USD, EUR, CNY]

export const ETH: FungibleAsset & CoinGeckoAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

export const MATIC: FungibleAsset & CoinGeckoAsset = {
  name: "Matic",
  symbol: "MATIC",
  decimals: 18,
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

export const BTC: FungibleAsset & CoinGeckoAsset = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
}

export const BASE_ASSETS = [ETH, BTC, MATIC]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce<{
  [assetSymbol: string]: FungibleAsset
}>((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
