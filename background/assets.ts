import { TokenList } from "@uniswap/token-lists"
import { UNIXTime, HexString } from "./types"
import { NetworkSpecific, SmartContract, Network } from "./networks"
import { convertFixedPoint, fromFixedPoint } from "./lib/fixed-point"

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

/**
 * Converts the given source asset amount, fungible or non-fungible, to a target
 * asset amount based on the conversion rate in the passed price point.
 *
 * In both cases, the price point is expected to have the source asset first
 * and then the target asset. For non-fungible assets, the price point must
 * have an `amount` of 1 for the source asset.
 *
 * The converted amount is returned as an AssetAmount of the target asset.
 *
 * If the source or target assets are not fungible, or if the source asset in
 * the price point does not match the asset of the `sourceAssetAmount`, returns
 * `undefined`.
 *
 * @param sourceAssetAmount The AssetAmount being converted. The asset of this
 *        amount should match the first asset in the price point.
 * @param assetPricePoint A PricePoint with the first item being the source asset
 *        and the second being the target asset.
 *
 * @return If the source and target assets are both fungible, the target asset
 *         amount corresponding to the passed source asset amount. If the source
 *         asset is non-fungible and the price point is the price of one unit of
 *         the source asset, the target asset amount in the price point. Otherwise,
 *         undefined.
 */
export function convertAssetAmountViaPricePoint<T extends AnyAssetAmount>(
  sourceAssetAmount: T,
  assetPricePoint: PricePoint
): FungibleAssetAmount | undefined {
  const [sourceAsset, targetAsset] = assetPricePoint.pair
  const [sourceConversionFactor, targetConversionFactor] =
    assetPricePoint.amounts

  if (
    sourceAssetAmount.asset.symbol === sourceAsset.symbol &&
    isFungibleAsset(sourceAsset) &&
    isFungibleAsset(targetAsset)
  ) {
    const [sourceDecimals, targetDecimals] = [
      sourceAsset.decimals,
      targetAsset.decimals,
    ]

    const combinedDecimals = sourceDecimals + targetDecimals

    // A price point gives us X of the source asset = Y of the target asset, as
    // a pair of fixed-point values. We have M of the source asset, and want to
    // find out how much of the target asset that is.
    //
    // The simple version is that we want to do M * X / Y; however, we also
    // need to deal with the different fixed-point decimal amounts, and want to
    // end up reporting the converted amount in the decimals of the target
    // asset.
    //
    // Below, M is the source asset amount, X is the sourceConversionFactor,
    // and Y is the targetConversionFactor. Extra parentheses are added around
    // the multiplication to emphasize order matters! If we computed X / Y
    // first we would risk losing precision in the integer division.
    const targetCurrencyAmount =
      (sourceAssetAmount.amount * sourceConversionFactor) /
      targetConversionFactor

    // Reduce the fixed-point representation to the target asset's decimals.
    return {
      asset: targetAsset,
      amount: convertFixedPoint(
        targetCurrencyAmount,
        combinedDecimals,
        targetDecimals
      ),
    }
  }

  // For non-fungible assets, require that the target asset be fungible and
  // that the source conversion factor be 1, i.e. that the price point tells us
  // what 1 of the source asset is in target asset terms.
  if (
    sourceAssetAmount.asset.symbol === sourceAsset.symbol &&
    isFungibleAsset(targetAsset) &&
    sourceConversionFactor === 1n
  ) {
    return {
      asset: targetAsset,
      amount: targetConversionFactor,
    }
  }

  return undefined
}

/**
 * Given a FungibleAssetAmount and a desired number of decimals, convert the
 * amount to a floating point JavaScript number with the specified number of
 * decimal points (modulo floating point precision oddities).
 *
 * NOTE: The resulting number may not have perfect accuracy, and is truncated
 * rather than rounded. It should not be used for further math that requires
 * accuracy.
 *
 * @param assetAmount The asset and (fixed point bigint) amount to convert.
 * @return The floating point JavaScript number representation of the given
 *         asset amount, truncated to the given number of decimal points.
 */
export function assetAmountToDesiredDecimals(
  assetAmount: FungibleAssetAmount,
  desiredDecimals: number
): number {
  const {
    amount,
    asset: { decimals },
  } = assetAmount

  return fromFixedPoint(amount, decimals, desiredDecimals)
}
