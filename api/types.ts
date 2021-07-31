export { Transaction, UnsignedTransaction } from "@ethersproject/transactions"

export interface TokenListReference {
  name: string
  url: string
  logoURL?: string
}

export interface AssetMetadata {
  coinGeckoId?: string
  logoURL?: string
  websiteURL?: string
  tokenLists: TokenListReference[]
}

export interface Asset {
  symbol: string
  name: string
  metadata?: AssetMetadata
}

/*
 * Fungible assets include coins, currencies, and many tokens.
 */
export type FungibleAsset = Asset & {
  decimals: number
}

export type FiatCurrency = FungibleAsset

export type NetworkFamily = "EVM" | "BTC"

export interface Network {
  name: string
  baseAsset: FungibleAsset
  family: NetworkFamily
  chainId?: string
}

export type NetworkSpecificSmartContract = {
  homeNetwork: Network
  contractAddress: string
}

export type NetworkAsset = Asset & NetworkSpecificSmartContract

export type NetworkFungibleAsset = FungibleAsset & NetworkSpecificSmartContract

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export interface AssetAmount {
  asset: FungibleAsset
  amount: BigInt
}

/*
 * Used to represent the price (per single unit) of an asset, fungible or
 * non-fungible, against a fungible asset. Note the fungible asset can be
 * something like an ERC-20 token or fiat currency.
 */
export interface UnitPriceAndTime {
  unitPrice: AssetAmount
  lastUpdated: number
}
