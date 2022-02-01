import {
  AnyAssetAmount,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
  unitPricePointForPricePoint,
  isFungibleAssetAmount,
  PricePoint,
} from "../../assets"

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
 *        point pair.
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
  assetPricePoint: PricePoint,
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
