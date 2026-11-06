import { TypedDataField } from "@ethersproject/abstract-signer"
import type { Opaque } from "./tag-types"

/**
 * Named type for strings that should be URIs.
 *
 * Currently *does not offer type safety*, just documentation value; see
 * https://github.com/microsoft/TypeScript/issues/202 and
 * https://github.com/microsoft/TypeScript/issues/41160 for TS features that
 * would give this some more teeth. Right now, any `string` can be assigned
 * into a variable of type `URI` and vice versa.
 */
export type URI = string

/**
 * Named type for strings that should be domain names.
 *
 * Currently *does not offer type safety*, just documentation value; see
 * https://github.com/microsoft/TypeScript/issues/202 and
 * https://github.com/microsoft/TypeScript/issues/41160 for TS features that
 * would give this some more teeth. Right now, any `string` can be assigned
 * into a variable of type `DomainName` and vice versa.
 */
export type DomainName = string

/**
 * Tagged type for `0x`-prefixed hexadecimal strings: EVM addresses,
 * transaction hashes, calldata, hex-encoded quantities.
 *
 * The tag is the `0x` template-literal prefix. Hex literals in source code
 * type-check as-is, but an arbitrary `string` is *not* assignable to
 * `HexString`. Values entering the system from outside (RPC responses, user
 * input, persisted data, untyped libraries) must go through `toHexString`
 * (validating) or `isHexString` (narrowing) from `lib/utils/hex`.
 * `HexString` is still assignable to `string`, so reading and formatting hex
 * values needs no conversion.
 *
 * This keeps non-EVM address formats (e.g. Spark bech32m addresses, which are
 * plain strings) from flowing into EVM-only code paths unnoticed.
 */
export type HexString = `0x${string}`

declare const NormalizedEVMAddressSymbol: unique symbol

/**
 * A lowercased, `0x`-prefixed EVM address. Every `NormalizedEVMAddress` is a
 * `HexString`, but not vice versa.
 */
export type NormalizedEVMAddress = Opaque<
  HexString,
  typeof NormalizedEVMAddressSymbol
>

/**
 * A Spark address: a bech32m string whose human-readable part names the
 * Spark network (`spark1…` on mainnet, `sparkrt1…` on regtest).
 *
 * Like `HexString`, the tag is a template-literal prefix, so Spark and EVM
 * addresses are mutually unassignable. Convert untrusted strings with
 * `toSparkAddress` / `isSparkAddress` from `lib/spark-address`.
 */
export type SparkAddress = `spark1${string}` | `sparkrt1${string}`

/*
 * Named type for a number measuring time in seconds since the Unix Epoch,
 * January 1st, 1970 UTC.
 *
 * Currently *does not offer type safety*, just documentation value; see
 * https://github.com/microsoft/TypeScript/issues/202 and for a TS feature that
 * would give this some more teeth. Right now, any `number` can be assigned
 * into a variable of type `UNIXTime` and vice versa.
 */
export type UNIXTime = number

export type EIP712DomainType = {
  name?: string
  version?: string
  chainId?: number | string
  verifyingContract?: HexString
}

export type EIP712TypedData<T = Record<string, unknown>> = {
  domain: EIP712DomainType
  types: Record<string, TypedDataField[]>
  message: T
  primaryType: string
}

export type EIP191Data = string

export type Writeable<T> = { -readonly [P in keyof T]: T[P] }

export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }
