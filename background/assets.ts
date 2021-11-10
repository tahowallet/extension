import { TokenList } from "@uniswap/token-lists"
import { UNIXTime, HexString } from "./types"
import { NetworkSpecific, SmartContract, Network } from "./networks"

export type TokenListCitation = {
  name: string
  url: string
  logoURL?: string
}

export type TokenListAndReference = {
  url: string
  tokenList: TokenList
}

export type AssetMetadata = {
  coinGeckoId?: string
  logoURL?: string
  websiteURL?: string
  tokenLists: TokenListCitation[]
}

export type Asset = {
  symbol: string
  name: string
  metadata?: AssetMetadata
}

export type CoinGeckoAsset = Asset & {
  metadata: Asset["metadata"] & {
    coinGeckoId: string
  }
}

/*
 * Fungible assets include coins, currencies, and many tokens.
 */
export type FungibleAsset = Asset & {
  decimals: number
}

export type FiatCurrency = FungibleAsset

export type NetworkSpecificAsset = NetworkSpecific & Asset

export type SmartContractAsset = SmartContract & Asset

export type SmartContractFungibleAsset = FungibleAsset & SmartContract

/*
 * The primary type representing amounts in fungible or non-fungible asset
 * transactions.
 */
export type AssetAmount = {
  asset: Asset
  amount: bigint
}

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export type FungibleAssetAmount = {
  asset: FungibleAsset
  amount: bigint
}

/*
 * A union of all assets we expect to price.
 */
export type AnyAsset =
  | Asset
  | NetworkSpecificAsset
  | FiatCurrency
  | FungibleAsset
  | SmartContractFungibleAsset

/*
 * The primary type representing amounts in fungible asset transactions.
 */
export type AnyAssetAmount = {
  asset: AnyAsset
  amount: bigint
}

/*
 * Represents a price relationship between two assets, fungible or non-fungible,
 * at a given time.
 *
 * PricePoint is the preferred price type, as it includes both sides of a pair
 * and doesn't give up any accuracy.
 */
export type PricePoint = {
  pair: [AnyAsset, AnyAsset]
  amounts: [bigint, bigint]
  time: UNIXTime
}

/*
 * Used to represent the price (per single unit) of an asset, fungible or
 * non-fungible, against a fungible asset. Note the fungible asset can be
 * something like an ERC-20 token or fiat currency.
 *
 * In almost all cases, PricePoint should be preferred. UnitPricePoint should
 * only be used when the details of the other side of a price pair are unknown.
 */
export type UnitPricePoint = {
  unitPrice: AnyAssetAmount
  time: UNIXTime
}

export type AssetTransfer = {
  network: Network
  assetAmount: AssetAmount
  from: HexString
  to: HexString
  dataSource: "alchemy" | "local"
  txHash: string
}

export function isSmartContractFungibleAsset(
  asset: AnyAsset
): asset is SmartContractFungibleAsset {
  return "homeNetwork" in asset && "contractAddress" in asset
}
