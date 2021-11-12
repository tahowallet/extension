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

/**
 * Convert a fixed point bigint with precision `fixedPointPrecision` to a
 * floating point number truncated to `desiredPrecision`. Note that precision
 * is not guaranteed, as it is possible that the fixed point number cannot be
 * accurately represented as a floating point number.
 *
 * This function is best used as the last step after any computations are done.
 */
export function fromFixedPoint(
  fixedPoint: bigint,
  fixedPointPrecision: number,
  desiredPrecision: number
): number {
  const fixedPointDesiredPrecisionAmount =
    fixedPoint / 10n ** (BigInt(fixedPointPrecision) - BigInt(desiredPrecision))

  return Number(fixedPointDesiredPrecisionAmount) / 10 ** desiredPrecision
}

/**
 * Convert a fixed point bigint with precision `fixedPointPrecision` to another
 * fixed point bigint with precision `targetPrecision`. It is highly recommended
 * that the precision of the fixed point bigint is tracked alongside the number,
 * e.g. as with the Asset type.
 */
export function convertFixedPoint(
  fixedPoint: bigint,
  fixedPointPrecision: number,
  targetPrecision: number
): bigint {
  if (fixedPointPrecision >= targetPrecision) {
    return fixedPoint / 10n ** BigInt(fixedPointPrecision - targetPrecision)
  }

  return fixedPoint * 10n ** BigInt(targetPrecision - fixedPointPrecision)
}
