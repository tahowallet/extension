const SATS_PER_BTC = 100_000_000n

/**
 * Format a fixed-point token amount without losing precision, trimming
 * trailing zeros.
 */
export function formatFixedPoint(amount: bigint, decimals: number): string {
  const negative = amount < 0n
  const absolute = negative ? -amount : amount
  const base = 10n ** BigInt(decimals)
  const whole = absolute / base
  const fraction = (absolute % base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "")
  const formattedWhole = whole.toLocaleString("en-US")
  return `${negative ? "-" : ""}${formattedWhole}${
    fraction.length > 0 ? `.${fraction}` : ""
  }`
}

export function formatBTC(sats: bigint): string {
  return formatFixedPoint(sats, 8)
}

export function formatSats(sats: bigint): string {
  return `${sats.toLocaleString("en-US")} sats`
}

export function satsToBTCNumber(sats: bigint): number {
  return Number(sats) / Number(SATS_PER_BTC)
}

export function shortenSparkAddress(address: string): string {
  const separator = address.indexOf("1")
  const prefixLength = separator > -1 ? separator + 5 : 10
  return `${address.slice(0, prefixLength)}…${address.slice(-6)}`
}

/**
 * Parse a user-entered whole number of satoshis. Returns undefined for
 * anything that isn't a positive safe integer.
 */
export function parseSats(input: string): number | undefined {
  const trimmed = input.trim().replace(/[,_\s]/g, "")
  if (!/^\d+$/.test(trimmed)) {
    return undefined
  }
  const value = Number(trimmed)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
}
