import { CoinGeckoAsset } from "../assets"
import { NetworkBaseAsset } from "../networks"

const ETH: NetworkBaseAsset = {
  chainID: "1",
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const ARBITRUM_ONE_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "42161",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const ARBITRUM_NOVA_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "42170",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const OPTIMISTIC_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "10",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const SEPOLIA_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "11155111",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const ARBITRUM_SEPOLIA_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "421614",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const RBTC: NetworkBaseAsset = {
  chainID: "30",
  name: "RSK Token",
  symbol: "RBTC",
  decimals: 18,
  metadata: {
    coinGeckoID: "rootstock",
    tokenLists: [],
  },
}

const MATIC: NetworkBaseAsset = {
  chainID: "137",
  name: "Matic Token",
  symbol: "MATIC",
  decimals: 18,
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

const AVAX: NetworkBaseAsset = {
  chainID: "43114",
  name: "Avalanche",
  symbol: "AVAX",
  decimals: 18,
  metadata: {
    coinGeckoID: "avalanche-2",
    tokenLists: [],
    websiteURL: "https://avax.network/",
  },
}

const BNB: NetworkBaseAsset = {
  chainID: "56",
  name: "Binance Coin",
  symbol: "BNB",
  decimals: 18,
  metadata: {
    coinGeckoID: "binancecoin",
    tokenLists: [],
    websiteURL: "https://bnbchain.org",
  },
}

const ZK_SYNC_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "324",
}

const MEZO_BTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  chainID: "31611",
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 18,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
  },
}

const MEZO_MAINNET_BTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  chainID: "31612",
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 18,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
  },
}

const BOB_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "60808",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
  },
}

const CITREA_BTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  chainID: "4114",
  name: "Citrea Bitcoin",
  symbol: "cBTC",
  decimals: 18,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
  },
}

const BOTANIX_BTC: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  chainID: "3637",
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 18,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
  },
}

const CORE_TOKEN: NetworkBaseAsset & Required<CoinGeckoAsset> = {
  chainID: "1116",
  name: "Core",
  symbol: "CORE",
  decimals: 18,
  metadata: {
    coinGeckoID: "coredaoorg",
    tokenLists: [],
    websiteURL: "https://coredao.org",
  },
}

export const BASE_ASSETS_BY_CUSTOM_NAME = {
  ETH,
  MATIC,
  MEZO_BTC,
  MEZO_MAINNET_BTC,
  RBTC,
  AVAX,
  BNB,
  ARBITRUM_ONE_ETH,
  ARBITRUM_NOVA_ETH,
  OPTIMISTIC_ETH,
  SEPOLIA_ETH,
  ARBITRUM_SEPOLIA_ETH,
  ZK_SYNC_ETH,
  BOB_ETH,
  CITREA_BTC,
  BOTANIX_BTC,
  CORE_TOKEN,
}

export const BASE_ASSETS = Object.values(BASE_ASSETS_BY_CUSTOM_NAME)
