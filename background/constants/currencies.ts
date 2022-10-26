import { FiatCurrency, FungibleAsset, CoinGeckoAsset } from "../assets"
import { NetworkBaseAsset } from "../networks"
import { coinTypesByAssetSymbol } from "./coin-types"

export const USD: FiatCurrency = {
  name: "United States Dollar",
  symbol: "USD",
  decimals: 10,
}

export const FIAT_CURRENCIES = [USD]
export const FIAT_CURRENCIES_SYMBOL = FIAT_CURRENCIES.map(
  (currency) => currency.symbol
)

export const ETH: FungibleAsset & CoinGeckoAsset & NetworkBaseAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
  coinType: coinTypesByAssetSymbol.ETH,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

export const RBTC: FungibleAsset & CoinGeckoAsset & NetworkBaseAsset = {
  name: "RSK Token",
  symbol: "RBTC",
  decimals: 18,
  coinType: coinTypesByAssetSymbol.RBTC,
  metadata: {
    coinGeckoID: "rootstock",
    tokenLists: [],
    websiteURL: "https://www.rsk.co/",
  },
}

export const OPTIMISTIC_ETH: FungibleAsset & CoinGeckoAsset & NetworkBaseAsset =
  {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
    coinType: coinTypesByAssetSymbol.ETH,
    contractAddress: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    metadata: {
      coinGeckoID: "ethereum",
      tokenLists: [],
      websiteURL: "https://ethereum.org",
    },
  }

export const MATIC: FungibleAsset & CoinGeckoAsset & NetworkBaseAsset = {
  name: "Matic Token",
  symbol: "MATIC",
  decimals: 18,
  coinType: coinTypesByAssetSymbol.MATIC,
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

export const BTC: FungibleAsset & CoinGeckoAsset & NetworkBaseAsset = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
  coinType: coinTypesByAssetSymbol.BTC,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
}

export const BASE_ASSETS = [ETH, BTC, MATIC, RBTC, OPTIMISTIC_ETH]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce<{
  [assetSymbol: string]: FungibleAsset & CoinGeckoAsset & NetworkBaseAsset
}>((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
