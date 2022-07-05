import {
  AnyAssetAmount,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
  unitPricePointForPricePoint,
  isFungibleAssetAmount,
  PricePoint,
  FungibleAsset,
  UnitPricePoint,
  AnyAsset,
} from "../../assets"
import { fromFixedPointNumber } from "../../lib/fixed-point"
import { AnyNetwork, NetworkBaseAsset } from "../../networks"

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

function isBaseAsset(asset: AnyAsset): asset is NetworkBaseAsset {
  return "coinType" in asset
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
export function isNetworkBaseAsset(
  asset: AnyAsset,
  network: AnyNetwork
): asset is NetworkBaseAsset {
  return (
    isBaseAsset(asset) &&
    asset.symbol === network.baseAsset.symbol &&
    asset.coinType === network.baseAsset.coinType &&
    asset.name === network.baseAsset.name
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
  desiredDecimals: number
): string {
  return (
    new Intl.NumberFormat("default", {
      style: "currency",
      currency: currencySymbol,
      minimumFractionDigits: desiredDecimals,
      maximumFractionDigits: desiredDecimals,
    })
      .format(currencyAmount)
      // FIXME This assumes the assetSymbol passed is USD
      // FIXME Instead, we should use formatToParts.
      .split("$")[1]
  )
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
  T extends AnyAssetAmount
>(
  assetAmount: T,
  assetPricePoint: PricePoint | undefined,
  desiredDecimals: number
): T & AssetMainCurrencyAmount {
  const convertedAssetAmount = convertAssetAmountViaPricePoint(
    assetAmount,
    assetPricePoint
  )
  const { unitPrice } = unitPricePointForPricePoint(assetPricePoint) ?? {
    unitPrice: undefined,
  }

  if (typeof convertedAssetAmount !== "undefined") {
    const convertedDecimalValue = assetAmountToDesiredDecimals(
      convertedAssetAmount,
      desiredDecimals
    )
    const unitPriceDecimalValue =
      typeof unitPrice === "undefined"
        ? undefined
        : assetAmountToDesiredDecimals(unitPrice, desiredDecimals)

    return {
      ...assetAmount,
      mainCurrencyAmount: convertedDecimalValue,
      localizedMainCurrencyAmount: formatCurrencyAmount(
        convertedAssetAmount.asset.symbol,
        convertedDecimalValue,
        desiredDecimals
      ),
      unitPrice: unitPriceDecimalValue,
      localizedUnitPrice:
        typeof unitPriceDecimalValue === "undefined"
          ? undefined
          : formatCurrencyAmount(
              convertedAssetAmount.asset.symbol,
              unitPriceDecimalValue,
              desiredDecimals
            ),
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
  desiredDecimals: number
): T & AssetDecimalAmount {
  const decimalAmount = isFungibleAssetAmount(assetAmount)
    ? assetAmountToDesiredDecimals(assetAmount, desiredDecimals)
    : // If the asset is not fungible, the amount should have 0 decimals of
      // precision.
      assetAmountToDesiredDecimals(
        { ...assetAmount, asset: { ...assetAmount.asset, decimals: 0 } },
        desiredDecimals
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
  unitPrice: UnitPricePoint<FungibleAsset> | number | undefined
): number {
  const numericUnitPrice =
    typeof unitPrice === "undefined" || typeof unitPrice === "number"
      ? unitPrice
      : fromFixedPointNumber(
          {
            amount: unitPrice.unitPrice.amount,
            decimals: unitPrice.unitPrice.asset.decimals,
          },
          10
        )

  return Math.max(
    // If no unit price is provided, just assume 0, which will use the minimum
    // desired decimals. Supporting this makes it easier for callers to
    // special-case unit prices that could not be resolved.
    Math.ceil(Math.log10(numericUnitPrice ?? 0)),
    minimumDesiredDecimals
  )
}
