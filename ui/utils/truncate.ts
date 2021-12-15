export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(37, 42)}`
}

export function truncateDecimalAmount(
  value: number | string,
  decimalLength: number
): string | number {
  const valueString = value.toString()
  const decimalIndex = valueString.indexOf(".")
  if (decimalIndex !== -1) {
    const integers = valueString.split(".")[0]
    const decimals = valueString.split(".")[1]
    return `${integers}.${decimals.substr(0, decimalLength)}`
  }
  return value
}
