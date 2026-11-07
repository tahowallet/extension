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
