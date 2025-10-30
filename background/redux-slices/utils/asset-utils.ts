import { ExchangeRate, FixedPoint, Money, currencies } from "@thesis-co/cent"
import {
  AnyAsset,
  AnyAssetAmount,
  AssetMetadata,
  CoinGeckoAsset,
  DisplayCurrency,
  FiatCurrency,
  FungibleAsset,
  PricePoint,
  SmartContractFungibleAsset,
  UnitPricePoint,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
  isFungibleAssetAmount,
  isSmartContractFungibleAsset,
  unitPricePointForPricePoint,
} from "../../assets"
import {
  BUILT_IN_NETWORK_BASE_ASSETS,
  OPTIMISM,
  POLYGON,
} from "../../constants"
import { fromFixedPointNumber } from "../../lib/fixed-point"
import { sameEVMAddress } from "../../lib/utils"
import { AnyNetwork, NetworkBaseAsset, sameNetwork } from "../../networks"

/**
 * Adds user-specific amounts based on preferences. This is the combination of
 * a conversion to the user's preferred currency for viewing as a floating
 * point number, as well as a conversion to a localized form of that
 * representation. Also includes the price per token in the main currency, in
 * localized form.
 */
export type AssetMainCurrencyAmount = {
  mainCurrencyAmount?: number
  localizedMainCurrencyAmount?: string
  unitPrice?: number
  localizedUnitPrice?: string
}

/**
 * Adds a conversion of the asset amount to a floating point number, as well as
 * a conversion to a localized form of that representation.
 */
export type AssetDecimalAmount = {
  decimalAmount: number
  localizedDecimalAmount: string
}

/**
 * All network base assets have a chainID property
 */
export function isNetworkBaseAsset(asset: AnyAsset): asset is NetworkBaseAsset {
  return "chainID" in asset
}

function isOptimismBaseAsset(asset: AnyAsset) {
  const hasMatchingChainID =
    (isSmartContractFungibleAsset(asset) &&
      asset.homeNetwork.chainID === OPTIMISM.chainID) ||
    (isNetworkBaseAsset(asset) && asset.chainID === OPTIMISM.chainID)

  return (
    hasMatchingChainID &&
    "contractAddress" in asset &&
    asset.contractAddress === OPTIMISM.baseAsset.contractAddress
  )
}

function isPolygonBaseAsset(asset: AnyAsset) {
  const hasMatchingChainID =
    (isSmartContractFungibleAsset(asset) &&
      asset.homeNetwork.chainID === POLYGON.chainID) ||
    (isNetworkBaseAsset(asset) && asset.chainID === POLYGON.chainID)

  return (
    hasMatchingChainID &&
    "contractAddress" in asset &&
    asset.contractAddress === POLYGON.baseAsset.contractAddress
  )
}

/**
 * Given an asset and a network, determines whether the given asset is the base
 * asset for the given network. Used to special-case transactions that should
 * work differently for base assets vs, for example, smart contract assets.
 *
 * @param asset The asset that could be a base asset for a network.
 * @param network The network whose base asset `asset` should be checked against.
 *
 * @return True if the passed asset is the base asset for the passed network.
 */
export function isBaseAssetForNetwork(
  asset: AnyAsset,
  network: AnyNetwork,
): asset is NetworkBaseAsset {
  if (network.chainID === OPTIMISM.chainID && isOptimismBaseAsset(asset)) {
    return true
  }

  if (network.chainID === POLYGON.chainID && isPolygonBaseAsset(asset)) {
    return true
  }

  return (
    isNetworkBaseAsset(asset) &&
    asset.symbol === network.baseAsset.symbol &&
    asset.chainID === network.baseAsset.chainID &&
    asset.name === network.baseAsset.name
  )
}

/**
 * Return network base asset for chain by asset symbol.
 */
export function getBuiltInNetworkBaseAsset(
  symbol: string,
  chainID: string,
): (NetworkBaseAsset & Required<CoinGeckoAsset>) | undefined {
  return BUILT_IN_NETWORK_BASE_ASSETS.find(
    (asset) => asset.symbol === symbol && asset.chainID === chainID,
  )
}

/**
 * @param asset1 any asset
 * @param asset2 any asset
 * @returns true if both assets are the same network base assets
 */
export function sameNetworkBaseAsset(
  asset1: AnyAsset,
  asset2: AnyAsset,
): boolean {
  // for base assets with possible homeNetwork field
  if (isOptimismBaseAsset(asset1) && isOptimismBaseAsset(asset2)) return true

  if (isPolygonBaseAsset(asset1) && isPolygonBaseAsset(asset2)) return true

  // for other base assets
  if (
    "homeNetwork" in asset1 ||
    "homeNetwork" in asset2 ||
    !isNetworkBaseAsset(asset1) ||
    !isNetworkBaseAsset(asset2)
  ) {
    return false
  }

  return (
    asset1.symbol === asset2.symbol &&
    asset1.chainID === asset2.chainID &&
    asset1.name === asset2.name
  )
}

/**
 * Tests whether two assets should be considered the same built in network base asset.
 */
export function sameBuiltInNetworkBaseAsset(
  asset1: AnyAsset,
  asset2: AnyAsset,
): boolean {
  return BUILT_IN_NETWORK_BASE_ASSETS.some(
    (baseAsset) =>
      sameNetworkBaseAsset(baseAsset, asset1) &&
      sameNetworkBaseAsset(baseAsset, asset2),
  )
}

/**
 * Given an asset symbol, price as a JavaScript number, and a number of desired
 * decimals during formatting, format the price in a localized way as a
 * currency of symbol `assetSymbol`.
 *
 * @param currencySymbol The symbol of the currency being formatted.
 * @param currencyAmount The amount of the currency being formatted.
 * @param desiredDecimals The desired number of decimals of the formatted
 *        result.
 *
 * @return A localized representatin of the currency amount with the given
 *         currency symbol.
 */
export function formatCurrencyAmount(
  currencySymbol: string,
  currencyAmount: number,
  desiredDecimals: number,
): string {
  const fmt = new Intl.NumberFormat("default", {
    style: "currency",
    currency: currencySymbol,
    minimumFractionDigits: desiredDecimals,
    maximumFractionDigits: desiredDecimals,
  })

  return fmt
    .formatToParts(currencyAmount)
    .filter((part) => part.type !== "currency")
    .map((part) => part.value)
    .join("")
    .trim()
}

export function convertUSDPricePointToCurrency(
  pricePoint: PricePoint,
  currency: DisplayCurrency,
) {
  if (currency.code === "USD") {
    // noop
    return pricePoint
  }
  const { pair, amounts, time } = pricePoint
  const idx = pricePoint.pair.findIndex((asset) => asset.symbol === "USD")

  const newPricePoint: PricePoint = {
    pair: [...pair],
    amounts: [...amounts],
    time,
  }

  const { name, code } = currencies[currency.code]

  const asset: FiatCurrency = {
    name,
    symbol: code,
    decimals: 10,
  }

  const rate = new ExchangeRate({
    // Keeping 10 decimals ensures we don't lose precision during conversion
    baseCurrency: { ...currencies[currency.code], decimals: 10n },
    quoteCurrency: { ...currencies.USD, decimals: 10n },
    rate: FixedPoint(currency.rate),
  })

  newPricePoint.pair[idx] = asset
  newPricePoint.amounts[idx] = rate
    .convert(
      Money({
        asset: currencies.USD,
        amount: FixedPoint({
          amount: newPricePoint.amounts[idx],
          decimals: 10n,
        }),
      }),
    )
    .concretize()[0].balance.amount.amount

  return newPricePoint
}

/**
 * Fill in amounts related to the user's preferred main currency for a priced
 * asset. The asset price point should be a PricePoint
 * with the assetAmount's asset as the first entry and the main currency as the
 * second. The decimal and localized values will be JavaScript numbers with
 * desiredDecimals numbers after the decimal point.
 *
 * @param assetAmount An amount with associated asset whose conversion to the
 *        main currency will be given by the price point.
 * @param assetPricePoint The price of the asset in `assetAmount` in terms of
 *        the main currency. The main currency should be second in the price
 *        point pair. If undefined, the main currency data will not be populated.
 * @param desiredDecimals The number of floating point decimals to keep when
 *        converting from fixed point to floating point. Also the number of
 *        decimals rendered in the localized form.
 *
 * @param displayCurrency The currency in which to express and localize values.
 *        Used for converting amounts (via its exchange rate) and for formatting
 *        according to the user’s locale.
 * @return The existing `assetAmount` with four additional fields,
 *         `mainCurrencyValue`, `localizedMainCurrencyValue`, `unitPrice` and
 *         `localizedUnitPrice`. The first is the value of the asset in the
 *         main currency as a floating point JS number suitable for simple
 *         mathematical operations and comparisons. The second is the same
 *         value converted to a localized string based on the user's locale.
 *         The third is the unit price for the asset in the user's preferred
 *         currency. Finally, the last is the same value converted to a
 *         localized string based on the user's locale.
 */
export function enrichAssetAmountWithMainCurrencyValues<
  T extends AnyAssetAmount,
>(
  assetAmount: T,
  assetPricePoint: PricePoint | undefined,
  desiredDecimals: number,
  displayCurrency: DisplayCurrency,
): T & AssetMainCurrencyAmount {
  if (assetPricePoint) {
    // Create a temporary pricepoint in the target user currency
    const currencyPricePoint = convertUSDPricePointToCurrency(
      assetPricePoint,
      displayCurrency,
    )

    const assetAmountInCurrency = convertAssetAmountViaPricePoint(
      assetAmount,
      currencyPricePoint,
    )
    const { unitPrice } = unitPricePointForPricePoint(currencyPricePoint) ?? {
      unitPrice: undefined,
    }

    if (typeof assetAmountInCurrency !== "undefined") {
      const convertedDecimalValue = assetAmountToDesiredDecimals(
        assetAmountInCurrency,
        desiredDecimals,
      )
      const unitPriceDecimalValue =
        typeof unitPrice === "undefined"
          ? undefined
          : assetAmountToDesiredDecimals(unitPrice, desiredDecimals)

      return {
        ...assetAmount,
        mainCurrencyAmount: convertedDecimalValue,
        localizedMainCurrencyAmount: formatCurrencyAmount(
          displayCurrency.code,
          convertedDecimalValue,
          desiredDecimals,
        ),
        unitPrice: unitPriceDecimalValue,
        localizedUnitPrice:
          typeof unitPriceDecimalValue === "undefined"
            ? undefined
            : formatCurrencyAmount(
                assetAmountInCurrency.asset.symbol,
                unitPriceDecimalValue,
                desiredDecimals,
              ),
      }
    }
  }

  return {
    ...assetAmount,
  }
}

/**
 * Fill in decimal amount equivalents for the given fixed point asset amount,
 * including a localized version.
 */
export function enrichAssetAmountWithDecimalValues<T extends AnyAssetAmount>(
  assetAmount: T,
  desiredDecimals: number,
): T & AssetDecimalAmount {
  const decimalAmount = isFungibleAssetAmount(assetAmount)
    ? assetAmountToDesiredDecimals(assetAmount, desiredDecimals)
    : // If the asset is not fungible, the amount should have 0 decimals of
      // precision.
      assetAmountToDesiredDecimals(
        { ...assetAmount, asset: { ...assetAmount.asset, decimals: 0 } },
        desiredDecimals,
      )

  return {
    ...assetAmount,
    decimalAmount,
    localizedDecimalAmount: decimalAmount.toLocaleString("default", {
      maximumFractionDigits: desiredDecimals,
    }),
  }
}

/**
 * Heuristically determine the number of decimal places to use for an asset
 * with a given given unitPrice.
 *
 * Heuristically add decimal places to high-unit-price assets, 1 decimal place
 * per order of magnitude in the unit price. For example, if USD is the main
 * currency and the asset unit price is $100, 2 decimal points, if $1000, 3
 * decimal points, if $10000, 4 decimal points, etc.
 *
 * Note that order of magnitude is rounded up (e.g. a $1000 unit price is 3
 * orders of magnitude and gets 3 decimal points, while $2000 is treated as
 * greater than 3 orders of magnitude, so it gets 4 decimal points).
 *
 * @param minimumDesiredDecimals The minimum number of decimals to return; for
 *        unit prices whose magnitude would heuristically land on fewer decimals,
 *        force the number to this minimum.
 * @param unitPrice The unit price as a decimal number.
 */
export function heuristicDesiredDecimalsForUnitPrice(
  minimumDesiredDecimals: number,
  unitPrice: UnitPricePoint<FungibleAsset> | number | undefined,
): number {
  const numericUnitPrice =
    typeof unitPrice === "undefined" || typeof unitPrice === "number"
      ? unitPrice
      : fromFixedPointNumber(
          {
            amount: unitPrice.unitPrice.amount,
            decimals: unitPrice.unitPrice.asset.decimals,
          },
          10,
        )

  return Math.max(
    // If no unit price is provided, just assume 0, which will use the minimum
    // desired decimals. Supporting this makes it easier for callers to
    // special-case unit prices that could not be resolved.
    Math.ceil(Math.log10(numericUnitPrice ?? 0)),
    minimumDesiredDecimals,
  )
}

/**
 * Check if the asset is from a token list.
 */
export function isTokenListAsset(asset: AnyAsset): boolean {
  const tokenListCount = asset.metadata?.tokenLists?.length ?? 0

  return tokenListCount > 0
}

/**
 * Checks if the asset is baseline trusted.
 * Baseline trusted means that wallet can trust them by default.
 * The asset is in a token list OR the asset is a network base asset.
 *
 */
export function isBaselineTrustedAsset(asset: AnyAsset): boolean {
  return isTokenListAsset(asset) || isNetworkBaseAsset(asset)
}

/**
 * Checks the user has explicitly verified the asset.
 * The verified property was manually set to true.
 *
 */
export function isVerifiedAsset(asset: AnyAsset): boolean {
  return asset.metadata?.verified !== undefined && asset.metadata.verified
}

/**
 * Checks the user has not explicitly verified the asset.
 * It can still be baseline trusted.
 *
 */
export function isUnverifiedAsset(asset: AnyAsset): boolean {
  return !isVerifiedAsset(asset)
}

/**
 * Checks if the asset can be treated as trusted.
 * Trusted means the asset is baseline trusted OR verified.
 *
 */
export function isTrustedAsset(asset: AnyAsset): asset is
  | NetworkBaseAsset
  | (SmartContractFungibleAsset & {
      metadata: { tokenLists: Exclude<AssetMetadata["tokenLists"], undefined> }
    })
  | (SmartContractFungibleAsset & { metadata: { verified: true } }) {
  return isBaselineTrustedAsset(asset) || isVerifiedAsset(asset)
}

/**
 * Checks if the asset is untrusted.
 * Untrusted means the asset is neither baseline trusted NOR verified.
 *
 */
export function isUntrustedAsset(asset: AnyAsset): boolean {
  return !isTrustedAsset(asset)
}

type AssetID = "base" | SmartContractFungibleAsset["contractAddress"]
type ChainID = string

export type FullAssetID = `${ChainID}/${AssetID}`

export const getFullAssetID = (
  asset: NetworkBaseAsset | SmartContractFungibleAsset,
): FullAssetID => {
  if (isNetworkBaseAsset(asset)) {
    return `${asset.chainID}/base`
  }

  return `${asset.homeNetwork.chainID}/${asset.contractAddress}`
}

// FIXME Unify once asset similarity code is unified.
export function isSameAsset(asset1?: AnyAsset, asset2?: AnyAsset): boolean {
  if (typeof asset1 === "undefined" || typeof asset2 === "undefined") {
    return false
  }

  if (
    isSmartContractFungibleAsset(asset1) &&
    isSmartContractFungibleAsset(asset2)
  ) {
    return (
      sameNetwork(asset1.homeNetwork, asset2.homeNetwork) &&
      sameEVMAddress(asset1.contractAddress, asset2.contractAddress)
    )
  }

  if (
    isSmartContractFungibleAsset(asset1) ||
    isSmartContractFungibleAsset(asset2)
  ) {
    return false
  }

  if (isNetworkBaseAsset(asset1) && isNetworkBaseAsset(asset2)) {
    return sameNetworkBaseAsset(asset1, asset2)
  }

  return asset1.symbol === asset2.symbol
}
