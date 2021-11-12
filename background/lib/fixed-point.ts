/**
 * Multiply n, a fixed point bigint by f, a float. Returns a fixed point bigint
 * of the same precision as `n`.
 */
export function multiplyByFloat(
  n: bigint,
  f: number,
  precision: number
): bigint {
  return (
    (n * BigInt(Math.floor(f * 10 ** precision))) / 10n ** BigInt(precision)
  )
}

/**
 * Converts the given `floatingPoint` number to a fixed point precision bigint
 * with a precision of `fixedPointPrecision` decimals.
 */
export function toFixedPoint(
  floatingPoint: number,
  fixedPointPrecision: number
): bigint {
  return multiplyByFloat(
    10n ** BigInt(fixedPointPrecision),
    floatingPoint,
    fixedPointPrecision
  )
}
