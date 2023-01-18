import { NetworkBaseAsset } from "../networks"

const ETH: NetworkBaseAsset = {
  chainID: "1",
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
}

const ARBITRUM_ONE_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "42161",
}

const ARBITRUM_NOVA_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "42170",
}

const OPTIMISTIC_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "10",
}

const GOERLI_ETH: NetworkBaseAsset = {
  ...ETH,
  chainID: "5",
}

const RBTC: NetworkBaseAsset = {
  chainID: "30",
  name: "RSK Token",
  symbol: "RBTC",
  decimals: 18,
}

const MATIC: NetworkBaseAsset = {
  chainID: "137",
  name: "Matic Token",
  symbol: "MATIC",
  decimals: 18,
}

const AVAX: NetworkBaseAsset = {
  chainID: "43114",
  name: "Avalanche",
  symbol: "AVAX",
  decimals: 18,
}

const BNB: NetworkBaseAsset = {
  chainID: "56",
  name: "Binance Coin",
  symbol: "BNB",
  decimals: 18,
}

const BTC: NetworkBaseAsset = {
  /**
   * To persist base asset to indexDB chainID must be declared.
   */
  chainID: "",
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
}

export const BASE_ASSETS_BY_CUSTOM_NAME = {
  ETH,
  BTC,
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
