import { FiatCurrency } from "../types"

export const DEFAULT_STATE = {
  tokenListURLs: [
    "https://gateway.ipfs.io/ipns/tokens.uniswap.org", // the Uniswap default list
    "https://yearn.science/static/tokenlist.json", // the Yearn list
    "https://messari.io/tokenlist/messari-verified", // Messari-verified projects
    "https://wrapped.tokensoft.eth.link", // Wrapped tokens
    "https://tokenlist.aave.eth.link", // Aave-listed tokens and interest-bearing assets
    "https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json", // Compound-listed tokens and interest-bearing assets
  ],
  currency: {
    name: "United States Dollar",
    symbol: "USD",
    decimals: 12,
  } as FiatCurrency,
}

export async function getCurrency(): Promise<FiatCurrency> {
  // TODO pull from preference extension storage
  return DEFAULT_STATE.currency
}

export async function getPrioritizedTokenListURLs(): Promise<string[]> {
  // TODO pull from preference extension storage
  return DEFAULT_STATE.tokenListURLs
}
