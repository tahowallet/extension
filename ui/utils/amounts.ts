import type { AnyAssetAmount } from "@tallyho/tally-background/assets"
import {
  FixedPointNumber,
  fixedPointNumberToString,
} from "@tallyho/tally-background/lib/fixed-point"

/** Amounts with more integer digits than this show in compact notation. */
export const COMPACT_ABOVE_INTEGER_DIGITS = 6

/**
 * Amounts with more integer digits than this show in scientific notation;
 * compact notation runs out of units at trillions in most locales.
 */
export const SCIENTIFIC_ABOVE_INTEGER_DIGITS = 14

export type DisplayAmount = {
  text: string
  /** The full amount, when `text` abbreviates it. */
  title?: string
}

/** An exact decimal string for a fixed-point amount, so huge ones lose no digits. */
function fixedPointToDecimalString({
  amount,
  decimals,
}: FixedPointNumber): string {
  return amount < 0n
    ? `-${fixedPointNumberToString({ amount: -amount, decimals })}`
    : fixedPointNumberToString({ amount, decimals })
}

function integerDigits(value: number | string): number {
  if (typeof value === "number") {
    const magnitude = Math.abs(value)
    return magnitude < 1 ? 0 : Math.floor(Math.log10(magnitude)) + 1
  }
  const [integer] = value.replace(/^-/, "").split(".")
  return integer.replace(/^0+/, "").length
}

/**
 * Display text for an amount. Ordinary amounts show as `localized`, or as a
 * plain localized number without it; huge ones are abbreviated, with the full
 * amount as `title`. For display only: never parse the result back.
 */
export function displayAmount(
  amount: FixedPointNumber | number,
  localized?: string,
  locales?: Intl.LocalesArgument,
): DisplayAmount {
  // Intl formats decimal strings exactly, unlike floats.
  const value =
    typeof amount === "number"
      ? amount
      : (fixedPointToDecimalString(amount) as Intl.StringNumericLiteral)
  const digits = integerDigits(value)

  if (
    digits <= COMPACT_ABOVE_INTEGER_DIGITS ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    return { text: localized ?? new Intl.NumberFormat(locales).format(value) }
  }

  const text = new Intl.NumberFormat(
    locales,
    digits > SCIENTIFIC_ABOVE_INTEGER_DIGITS
      ? { notation: "scientific", maximumFractionDigits: 2 }
      : { notation: "compact", maximumSignificantDigits: 3 },
  ).format(value)
  const title = new Intl.NumberFormat(locales, {
    maximumFractionDigits:
      typeof amount === "number" ? 20 : Math.min(amount.decimals, 100),
  }).format(value)

  return { text, title }
}

/** `displayAmount` for an asset amount, exact from its fixed-point value. */
export function displayAssetAmount(
  {
    asset,
    amount,
    localizedDecimalAmount,
  }: AnyAssetAmount & { localizedDecimalAmount: string },
  locales?: Intl.LocalesArgument,
): DisplayAmount {
  return displayAmount(
    { amount, decimals: "decimals" in asset ? asset.decimals : 0 },
    localizedDecimalAmount,
    locales,
  )
}
