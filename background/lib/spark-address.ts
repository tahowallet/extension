import { bech32m } from "@scure/base"
import type { SparkNetworkType } from "../networks"
import type { SparkAddress } from "../types"

/**
 * Human-readable bech32m prefixes for Spark addresses, by network. Mirrors
 * the Spark SDK's `AddressNetwork` for the networks Taho supports. Kept here
 * rather than imported from the SDK so UI code can validate addresses
 * without pulling the SDK into the popup bundle.
 */
export const SPARK_ADDRESS_PREFIXES: Record<SparkNetworkType, string> = {
  MAINNET: "spark",
  REGTEST: "sparkrt",
}

// Spark addresses carry a protobuf payload that exceeds bech32's default
// 90-character limit.
const SPARK_ADDRESS_MAX_LENGTH = 1024

/**
 * Decode a candidate Spark address, returning the network it belongs to, or
 * `undefined` if it is not a well-formed Spark address for a supported
 * network. Checks the bech32m checksum, not just the prefix.
 */
export function sparkAddressNetwork(
  candidate: string,
): SparkNetworkType | undefined {
  const lowercase = candidate.trim().toLowerCase()
  try {
    const { prefix } = bech32m.decode(
      lowercase as `${string}1${string}`,
      SPARK_ADDRESS_MAX_LENGTH,
    )
    return (Object.keys(SPARK_ADDRESS_PREFIXES) as SparkNetworkType[]).find(
      (network) => SPARK_ADDRESS_PREFIXES[network] === prefix,
    )
  } catch {
    return undefined
  }
}

export function isSparkAddress(
  candidate: unknown,
  network?: SparkNetworkType,
): candidate is SparkAddress {
  if (typeof candidate !== "string") {
    return false
  }
  const addressNetwork = sparkAddressNetwork(candidate)
  return (
    addressNetwork !== undefined &&
    (network === undefined || addressNetwork === network) &&
    // Only canonical lowercase addresses are tagged; callers should pass
    // user input through `toSparkAddress` to normalize it.
    candidate === candidate.toLowerCase()
  )
}

/**
 * Validate and normalize (trim, lowercase) a Spark address. Throws if the
 * string is not a valid Spark address, or not one for `network` when given.
 */
export function toSparkAddress(
  candidate: string,
  network?: SparkNetworkType,
): SparkAddress {
  const normalized = candidate.trim().toLowerCase()
  if (!isSparkAddress(normalized, network)) {
    throw new Error(
      network
        ? `"${candidate}" is not a valid Spark ${network.toLowerCase()} address`
        : `"${candidate}" is not a valid Spark address`,
    )
  }
  return normalized
}
