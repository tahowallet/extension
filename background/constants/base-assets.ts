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
    coinGeckoID: "arbitrum-one",
    tokenLists: [],
  },
}

const ARBITRUM_NOVA_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "42170",
  metadata: {
    coinGeckoID: "arbitrum-nova",
    tokenLists: [],
  },
}

const OPTIMISTIC_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "10",
  metadata: {
    coinGeckoID: "optimistic-ethereum",
    tokenLists: [],
  },
}

const GOERLI_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "5",
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
    coinGeckoID: "polygon-pos",
    tokenLists: [],
  },
}

const AVAX: NetworkBaseAsset = {
  chainID: "43114",
  name: "Avalanche",
  symbol: "AVAX",
  decimals: 18,
  metadata: {
    coinGeckoID: "avalanche",
    tokenLists: [],
  },
}

const BNB: NetworkBaseAsset = {
  chainID: "56",
  name: "Binance Coin",
  symbol: "BNB",
  decimals: 18,
  metadata: {
    coinGeckoID: "binance-smart-chain",
    tokenLists: [],
  },
}

export const BASE_ASSETS_BY_CUSTOM_NAME = {
  ETH,
  MATIC,
  RBTC,
  AVAX,
  BNB,
  ARBITRUM_ONE_ETH,
  ARBITRUM_NOVA_ETH,
  OPTIMISTIC_ETH,
  GOERLI_ETH,
}

export const BASE_ASSETS = Object.values(BASE_ASSETS_BY_CUSTOM_NAME)
