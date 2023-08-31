import { CoinGeckoAsset, FiatCurrency } from "../assets"
import { NetworkBaseAsset } from "../networks"
import { BASE_ASSETS_BY_CUSTOM_NAME } from "./base-assets"
import { coinTypesByAssetSymbol } from "./coin-types"

export const USD: FiatCurrency = {
  name: "United States Dollar",
  symbol: "USD",
  decimals: 10,
}

export const FIAT_CURRENCIES = [USD]
export const FIAT_CURRENCIES_SYMBOL = FIAT_CURRENCIES.map(
  (currency) => currency.symbol,
)

export const ETH_DATA = {
  coinType: coinTypesByAssetSymbol.ETH,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

export const ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.ETH,
  ...ETH_DATA,
}

export const RBTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.RBTC,
  coinType: coinTypesByAssetSymbol.RBTC,
  metadata: {
    coinGeckoID: "rootstock",
    tokenLists: [],
    websiteURL: "https://www.rsk.co/",
  },
}

export const OPTIMISTIC_ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.OPTIMISTIC_ETH,
  ...ETH_DATA,
  contractAddress: "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
}

export const ARBITRUM_ONE_ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.ARBITRUM_ONE_ETH,
  ...ETH_DATA,
}

export const ARBITRUM_NOVA_ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.ARBITRUM_NOVA_ETH,
  ...ETH_DATA,
}

export const GOERLI_ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.GOERLI_ETH,
  ...ETH_DATA,
}

export const ZK_SYNC_ETH: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.ZK_SYNC_ETH,
  ...ETH_DATA,
}

export const MATIC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.MATIC,
  coinType: coinTypesByAssetSymbol.MATIC,
  contractAddress: "0x0000000000000000000000000000000000001010",
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

export const AVAX: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.AVAX,
  coinType: coinTypesByAssetSymbol.AVAX,
  metadata: {
    coinGeckoID: "avalanche-2",
    tokenLists: [],
    websiteURL: "https://avax.network/",
  },
}

export const BNB: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  ...BASE_ASSETS_BY_CUSTOM_NAME.BNB,
  coinType: coinTypesByAssetSymbol.BNB,
  metadata: {
    coinGeckoID: "binancecoin",
    tokenLists: [],
    websiteURL: "https://bnbchain.org",
  },
}

export const BUILT_IN_NETWORK_BASE_ASSETS = [
  ETH,
  MATIC,
  RBTC,
  OPTIMISTIC_ETH,
  ARBITRUM_ONE_ETH,
  ARBITRUM_NOVA_ETH,
  GOERLI_ETH,
  AVAX,
  BNB,
]
