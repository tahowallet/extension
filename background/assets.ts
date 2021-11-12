import { TokenList } from "@uniswap/token-lists"
import { UNIXTime, HexString } from "./types"
import { NetworkSpecific, SmartContract, Network } from "./networks"

/**
 * A reference to a token list, with the name, URL, and potentially logo of the
 * list. Used to track the one or more token lists that include a given asset's
 * metadata.
 */
export type TokenListCitation = {
  name: string
  url: string
  logoURL?: string
}

/**
 * A `@uniswap/token-lists` token list alongside the URL that provided that
 * token list.
 */
export type TokenListAndReference = {
  url: string
  tokenList: TokenList
}

/**
 * Metadata for a given asset, as well as the one or more token lists that
 * provided that metadata.
 *
 * Note that the metadata is entirely optional.
 */
export type AssetMetadata = {
  coinGeckoID?: string
  logoURL?: string
  websiteURL?: string
  tokenLists: TokenListCitation[]
}

/**
 * The name and symbol of an arbitrary asset, fungible or non-fungible,
 * alongside potential metadata about that asset.
 */
export type Asset = {
  symbol: string
  name: string
  metadata?: AssetMetadata
}

/**
 * An asset whose metadata comes from CoinGecko and includes an associated
 * asset id in CoinGecko's records.
 */
export type CoinGeckoAsset = Asset & {
  metadata: Asset["metadata"] & {
    coinGeckoID: string
  }
}

/*
 * Fungible assets include coins, currencies, and many tokens.
 */
export type FungibleAsset = Asset & {
  decimals: number
}

/**
 * A simple alias for FungibleAsset to denote types that are expected to be
 * fiat currencies, typically used outside of the cryptocurrency world.
 *
 * Currently *does not offer type safety*, just documentation value; see
 * https://github.com/microsoft/TypeScript/issues/202 and for a TS feature that
 * would give this some more teeth. Right now, any `FiatCurrency` can be assigned
 * to any `FungibleAsset` and vice versa.
 */
export type FiatCurrency = FungibleAsset

/**
 * Any asset that exists on a particular network; see {@link NetworkSpecific)
 * for information on network-specific objects.
 */
export type NetworkSpecificAsset = NetworkSpecific & Asset

/**
 * Any asset that is managed by a smart contract; see {@link SmartContract) for
 * information on smart contract objects.
 */
export type SmartContractAsset = SmartContract & Asset

/**
 * Any fungible asset that is managed by a smart contract; see
 * {@link SmartContract) for information on smart contract objects.
 */
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

/**
 * An object representing a transfer of an asset from one address to another.
 * Includes information on where the information on the transfer was found, as
 * well as the transaction that executed the transfer.
 */
export type AssetTransfer = {
  network: Network
  assetAmount: AssetAmount
  from: HexString
  to: HexString
  dataSource: "alchemy" | "local"
  txHash: string
}

/**
 * Type guard to check if an AnyAsset is actually a FungibleAsset.
 */
function isFungibleAsset(asset: AnyAsset): asset is FungibleAsset {
  return "decimals" in asset
}

/**
 * Type guard to check if an AnyAsset is actually a SmartContractFungibleAsset.
 */
export function isSmartContractFungibleAsset(
  asset: AnyAsset
): asset is SmartContractFungibleAsset {
  return "homeNetwork" in asset && isFungibleAsset(asset)
}

/**
 * Type guard to check if an AnyAssetAmount is actually a FungibleAssetAmount.
 */
export function isFungibleAssetAmount(
  assetAmount: AnyAssetAmount
): assetAmount is FungibleAssetAmount {
  return isFungibleAsset(assetAmount.asset)
}
