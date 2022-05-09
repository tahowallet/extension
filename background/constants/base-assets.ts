import { CoinGeckoAsset, FungibleAsset } from "../assets"

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

export const BASE_ASSETS = [ETH, BTC]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce<{
  [assetSymbol: string]: FungibleAsset
}>((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
