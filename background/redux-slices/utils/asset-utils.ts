/**
 * Adds user-specific amounts based on preferences. This is the combination of
 * a conversion to the user's preferred currency for viewing as a floating
 * point number, as well as a conversion to a localized form of that
 * representation. Also includes the price per token in the main currency, in
 * localized form.
 */
export type AssetMainCurrencyAmount = {
  mainCurrencyAmount?: number
  pricePerToken?: number
  localizedMainCurrencyAmount?: string
  localizedPricePerToken?: string
}

/**
 * Adds a conversion of the asset amount to a floating point number, as well as
 * a conversion to a localized form of that representation.
 */
export type AssetDecimalAmount = {
  decimalAmount?: number
  localizedDecimalAmount?: string
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
