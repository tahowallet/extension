import { CoinGeckoAsset, FiatCurrency } from "../assets"
import { NetworkBaseAsset } from "../networks"
import { BASE_ASSETS_BY_SYMBOL } from "./base-assets"
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

export const ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.ETH,
  coinType: coinTypesByAssetSymbol.ETH,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

export const RBTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.RBTC,
  coinType: coinTypesByAssetSymbol.RBTC,
  metadata: {
    coinGeckoID: "rootstock",
    tokenLists: [],
    websiteURL: "https://www.rsk.co/",
  },
}

export const OPTIMISTIC_ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.ETH,
  coinType: coinTypesByAssetSymbol.ETH,
  contractAddress: "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

export const MATIC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.MATIC,
  coinType: coinTypesByAssetSymbol.MATIC,
  contractAddress: "0x0000000000000000000000000000000000001010",
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

export const AVAX: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.AVAX,
  coinType: coinTypesByAssetSymbol.AVAX,
  metadata: {
    coinGeckoID: "avalanche-2",
    tokenLists: [],
    websiteURL: "https://avax.network/",
  },
}

export const BNB: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.BNB,
  coinType: coinTypesByAssetSymbol.BNB,
  metadata: {
    coinGeckoID: "binancecoin",
    tokenLists: [],
    websiteURL: "https://bnbchain.org",
  },
}

export const BTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_SYMBOL.BTC,
  coinType: coinTypesByAssetSymbol.BTC,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
}

export const BASE_ASSETS_WITH_COIN_TYPE = [
  ETH,
  BTC,
  MATIC,
  RBTC,
  OPTIMISTIC_ETH,
  AVAX,
  BNB,
]

export const BASE_ASSETS_WITH_COIN_TYPE_BY_SYMBOL =
  BASE_ASSETS_WITH_COIN_TYPE.reduce<{
    [assetSymbol: string]: NetworkBaseAsset & Required<CoinGeckoAsset>
  }>((acc, asset) => {
    const newAcc = {
      ...acc,
    }
    newAcc[asset.symbol] = asset
    return newAcc
  }, {})
