import type { HexString } from "../../types"

const HEX_STRING_REGEX = /^0x[0-9a-fA-F]*$/

/**
 * Narrow an arbitrary value to a `HexString`: a `0x`-prefixed string of
 * hexadecimal digits (the empty `0x` is allowed, matching JSON-RPC's empty
 * data encoding).
 */
export function isHexString(value: unknown): value is HexString {
  return typeof value === "string" && HEX_STRING_REGEX.test(value)
}

/**
 * Validate and convert a string that is expected to be hex, such as an RPC
 * response field, a user-entered address or a value read back from storage.
 * Throws if the value is not a `0x`-prefixed hex string.
 */
export function toHexString(value: string): HexString {
  if (!isHexString(value)) {
    throw new Error(`Expected a 0x-prefixed hex string, got "${value}"`)
  }
  return value
}

/**
 * Like `toHexString`, but passes `undefined` and `null` through, for optional
 * fields.
 */
export function toOptionalHexString(
  value: string | undefined | null,
): HexString | undefined {
  return value === undefined || value === null ? undefined : toHexString(value)
}

/**
 * Convert without validating. Use only where the value comes from a source
 * that already guarantees hex output (e.g. ethers' `hexlify`, `getAddress`,
 * `keccak256`) and validating on a hot path would be wasteful. Prefer
 * `toHexString` everywhere else.
 */
export function unsafeHexString(value: string): HexString {
  return value as HexString
}
