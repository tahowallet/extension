import logger from "./logger"

/**
 * A fixed point number carrying an amount and the number of decimals it
 * represents.
 *
 * For example, the number 100,893.000107 tracked with a precision of 6
 * decimals is represented by the FixedPointNumber object:
 * ```
 * {
 *   amount: 100893000107n,
 *   decimals: 5
 * }
 * ```
 *
 * Convenience functions exist in this file to convert regular JavaScript
 * floating point Number to and from FixedPointNumber, as well as to multiply
 * FixedPointNumber and floats.
 */
export type FixedPointNumber = {
  amount: bigint
  decimals: number
}

/**
 * Convert a fixed point bigint with precision `fixedPointDecimals` to another
 * fixed point bigint with precision `targetDecimals`.
 *
 * It is highly recommended that the precision of the fixed point bigint is
 * tracked alongside the number, e.g. as with the FixedPointNumber type. To this
 * end, prefer `convertFixedPointNumber` unless you are already carrying
 * precision information separately.
 */
export function convertFixedPoint(
  fixedPoint: bigint,
  fixedPointDecimals: number,
  targetDecimals: number
): bigint {
  if (fixedPointDecimals >= targetDecimals) {
    return fixedPoint / 10n ** BigInt(fixedPointDecimals - targetDecimals)
  }

  return fixedPoint * 10n ** BigInt(targetDecimals - fixedPointDecimals)
}

/**
 * Convert a fixed point number to another fixed point bigint with precision
 * `targetDecimals`.
 */
export function convertFixedPointNumber(
  { amount, decimals }: FixedPointNumber,
  targetDecimals: number
): FixedPointNumber {
  return {
    amount: convertFixedPoint(amount, decimals, targetDecimals),
    decimals: targetDecimals,
  }
}
/**
 * Multiplies the two fixed point numbers of potentially different precisions,
 * returning the multiplied amount alongside the number of decimals in its
 * precision.
 *
 * Optionally, a `desiredResultDecimals` can be passed to convert the
 * multiplied value to a specific precision before returning.
 */
export function multiplyFixedPointNumbers(
  { amount: amount1, decimals: decimals1 }: FixedPointNumber,
  { amount: amount2, decimals: decimals2 }: FixedPointNumber,
  desiredResultDecimals?: number
): { amount: bigint; decimals: number } {
  const baseResult = {
    amount: amount1 * amount2,
    decimals: decimals1 + decimals2,
  }

  if (typeof desiredResultDecimals === "undefined") {
    return baseResult
  }

  return convertFixedPointNumber(baseResult, desiredResultDecimals)
}

/**
 * Multiply a FixedPointNumber by a float. Returns a fixed point bigint of the
 * same precision as the original fixed point number.
 */
export function multiplyByFloat(
  fixedPointNumber: FixedPointNumber,
  floatingPoint: number
): bigint {
  const floatingDecimals = (floatingPoint.toString().split(".")[1] ?? "").length

  return convertFixedPointNumber(
    multiplyFixedPointNumbers(fixedPointNumber, {
      amount: BigInt(Math.floor(floatingPoint * 10 ** floatingDecimals)),
      decimals: floatingDecimals,
    }),
    fixedPointNumber.decimals
  ).amount
}

/**
 * Converts the given `floatingPoint` number to a fixed point precision bigint
 * with `fixedPointDecimals` of precision.
 */
export function toFixedPoint(
  floatingPoint: number,
  fixedPointDecimals: number
): bigint {
  return multiplyByFloat(
    {
      amount: 10n ** BigInt(fixedPointDecimals),
      decimals: fixedPointDecimals,
    },
    floatingPoint
  )
}

/**
 * Converts the given `floatingPoint` number to a FixedPointNumber with
 * `fixedPointDecimals` of precision.
 */
export function toFixedPointNumber(
  floatingPoint: number,
  fixedPointDecimals: number
): FixedPointNumber {
  return {
    amount: toFixedPoint(floatingPoint, fixedPointDecimals),
    decimals: fixedPointDecimals,
  }
}

/**
 * Parses a simple floating point string in US decimal format (potentially
 * using commas as thousands separators, and using a single period as a decimal
 * separator) to a FixedPointNumber. The decimals in the returned
 * FixedPointNumber will match the number of digits after the decimal in the
 * floating point string.
 */
export function parseToFixedPointNumber(
  floatingPointString: string
): FixedPointNumber | undefined {
  if (!floatingPointString.match(/^[^0-9]*([0-9,]+)(?:\.([0-9]*))?$/)) {
    return undefined
  }

  const [whole, decimals, ...extra] = floatingPointString.split(".")

  // Only one `.` supported.
  if (extra.length > 0) {
    return undefined
  }

  const noThousandsSeparatorWhole = whole.replace(",", "")
  const setDecimals = decimals ?? ""

  try {
    return {
      amount: BigInt([noThousandsSeparatorWhole, setDecimals].join("")),
      decimals: setDecimals.length,
    }
  } catch (error) {
    // FIXME should be debug once logger.debug lands
    logger.debug(
      `Error parsing ${floatingPointString} to fixed-point number:`,
      error
    )
    return undefined
  }
}

/**
 * Converts a fixed point number with a bigint amount and a decimals field
 * indicating the orders of magnitude in `amount` behind the decimal point into
 * a string in US decimal format (no thousands separators, . for the decimal
 * separator).
 *
 * Note that for UI usage, it is _usually_ a better strategy to use
 * ``fromFixedPoint`` to convert to a JavaScript number and then use an
 * Intl.NumberFormat to format the number unless that is not an available
 * option or precision is critical. This function currently does _not_ respect
 * localization settings.
 */
export function fixedPointNumberToString(
  { amount, decimals }: FixedPointNumber,
  trimTrailingZeros = true
): string {
  const undecimaledAmount = amount.toString()
  const preDecimalLength = undecimaledAmount.length - decimals

  const preDecimalCharacters =
    preDecimalLength > 0
      ? undecimaledAmount.substring(0, preDecimalLength)
      : "0"
  const postDecimalCharacters =
    // The pre-decimal length is negative if the number is less than 1/10th of
    // a whole number; in these cases, we have to prefix 0s as the string
    // representation of the bigint won't have them. For example, the bigint
    // 5000 with decimals 5 represents 0.05000, but in this case
    // undecimaledAmount will just be "5000".
    "0".repeat(Math.max(-preDecimalLength, 0)) +
    undecimaledAmount.substring(preDecimalLength)

  const trimmedPostDecimalCharacters = trimTrailingZeros
    ? postDecimalCharacters.replace(/0*$/, "")
    : postDecimalCharacters

  const decimalString =
    trimmedPostDecimalCharacters.length > 0
      ? `.${trimmedPostDecimalCharacters}`
      : ""

  return `${preDecimalCharacters}${decimalString}`
}

/**
 * Convert a fixed point bigint with precision `fixedPointDecimals` to a
 * floating point number truncated to `desiredDecimals`. Note that precision
 * is not guaranteed, as it is possible that the fixed point number cannot be
 * accurately converted to or represented as a floating point number. If the
 * desired precision is higher than that tracked in the fixed point number, the
 * fixed point precision is used.
 *
 * This function is best used as the last step after any computations are done.
 */
export function fromFixedPoint(
  fixedPoint: bigint,
  fixedPointDecimals: number,
  desiredDecimals: number
): number {
  const fixedPointDesiredDecimalsAmount =
    fixedPoint /
    10n ** BigInt(Math.max(1, fixedPointDecimals - desiredDecimals))

  return (
    Number(fixedPointDesiredDecimalsAmount) /
    10 ** Math.min(desiredDecimals, fixedPointDecimals)
  )
}

/**
 * Convert a FixedPointNumber to a floating point number truncated to
 * `desiredDecimals`. Note that precision is not guaranteed, as it is possible
 * that the fixed point number cannot be accurately converted to or represented
 * as a floating point number. If the desired precision is higher than that
 * tracked in the fixed point number, the fixed point precision is used.
 *
 * This function is best used as the last step after any computations are done.
 */
export function fromFixedPointNumber(
  { amount, decimals }: FixedPointNumber,
  desiredDecimals: number
): number {
  return fromFixedPoint(amount, decimals, desiredDecimals)
}
