import { BaseAssetWithCoinType, NetworkBaseAsset } from "../networks"
import { coinTypesByAssetSymbol } from "./coin-types"
import { BASE_ASSETS } from "./currencies"

const SYMBOLS = BASE_ASSETS.map(({ symbol }) => symbol)
type BaseAssetSymbol = typeof SYMBOLS[number]

const DEFAULT_BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce(
  (sum, asset) => ({ ...sum, [asset.symbol]: asset }),
  {}
) as { [key in BaseAssetSymbol]: NetworkBaseAsset }

const ETH: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.ETH,
  coinType: coinTypesByAssetSymbol.ETH,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

const RBTC: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.RBTC,
  coinType: coinTypesByAssetSymbol.RBTC,
  metadata: {
    coinGeckoID: "rootstock",
    tokenLists: [],
    websiteURL: "https://www.rsk.co/",
  },
}

const OPTIMISTIC_ETH: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.ETH,
  coinType: coinTypesByAssetSymbol.ETH,
  contractAddress: "0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000",
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

const MATIC: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.MATIC,
  coinType: coinTypesByAssetSymbol.MATIC,
  contractAddress: "0x0000000000000000000000000000000000001010",
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

const AVAX: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.AVAX,
  coinType: coinTypesByAssetSymbol.AVAX,
  metadata: {
    coinGeckoID: "avalanche-2",
    tokenLists: [],
    websiteURL: "https://avax.network/",
  },
}

const BNB: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.BNB,
  coinType: coinTypesByAssetSymbol.BNB,
  metadata: {
    coinGeckoID: "binancecoin",
    tokenLists: [],
    websiteURL: "https://bnbchain.org",
  },
}

const BTC: BaseAssetWithCoinType = {
  ...DEFAULT_BASE_ASSETS_BY_SYMBOL.BTC,
  coinType: coinTypesByAssetSymbol.BTC,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
}

// eslint-disable-next-line import/prefer-default-export
export const BASE_ASSETS_WITH_COIN_TYPE = [
  ETH,
  BTC,
  MATIC,
  RBTC,
  OPTIMISTIC_ETH,
  AVAX,
  BNB,
]
