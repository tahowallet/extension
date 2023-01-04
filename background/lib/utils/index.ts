import { BigNumber, ethers, utils } from "ethers"
import { normalizeHexAddress, toChecksumAddress } from "@tallyho/hd-keyring"
import { NormalizedEVMAddress, UNIXTime } from "../../types"
import { EVMNetwork } from "../../networks"
import { ETHEREUM, GOERLI } from "../../constants"
import { AddressOnNetwork } from "../../accounts"

export function isValidChecksumAddress(
  address: string,
  chainId?: number
): boolean {
  return toChecksumAddress(address, chainId) === address
}

export function isMixedCaseAddress(address: string): boolean {
  let addressValue = address
  // If address is uppercase then convert 0X prefix to lowercase
  if (address.slice(0, 2) === "0X") {
    addressValue = `0x${address.slice(2)}`
  }

  return !(
    addressValue.match(/^(0x)?[0-9A-F]{40}$/) ||
    addressValue.match(/^(0x)?[0-9a-f]{40}$/)
  )
}

export function normalizeEVMAddress(
  address: string | Buffer
): NormalizedEVMAddress {
  return normalizeHexAddress(address) as NormalizedEVMAddress
}

export function normalizeAddressOnNetwork({
  address,
  network,
}: AddressOnNetwork): AddressOnNetwork {
  return {
    address: normalizeEVMAddress(address),
    network,
  }
}

export function truncateDecimalAmount(
  value: number | string,
  decimalLength: number
): string {
  const valueString = value.toString()
  if (decimalLength === 0) {
    return valueString.split(".")[0]
  }
  if (valueString.includes(".")) {
    const [integers, decimals] = valueString.split(".")
    return `${integers}.${decimals.substring(0, decimalLength)}`
  }
  return valueString
}

export function sameEVMAddress(
  address1: string | Buffer | undefined | null,
  address2: string | Buffer | undefined | null
): boolean {
  if (
    typeof address1 === "undefined" ||
    typeof address2 === "undefined" ||
    address1 === null ||
    address2 === null
  ) {
    return false
  }
  return normalizeHexAddress(address1) === normalizeHexAddress(address2)
}

export function gweiToWei(value: number | bigint): bigint {
  return BigInt(utils.parseUnits(value.toString(), "gwei").toString())
}

export function convertToEth(value: string | number | bigint): string {
  if (value && value >= 1) {
    return utils.formatUnits(BigInt(value))
  }
  return ""
}

export function weiToGwei(value: string | number | bigint): string {
  if (value && value >= 1) {
    return truncateDecimalAmount(utils.formatUnits(BigInt(value), "gwei"), 2)
  }
  return ""
}

/**
 * Encode an unknown input as JSON, special-casing bigints and undefined.
 *
 * @param input an object, array, or primitive to encode as JSON
 */
export function encodeJSON(input: unknown): string {
  return JSON.stringify(input, (_, value) => {
    if (typeof value === "bigint") {
      return { B_I_G_I_N_T: value.toString() }
    }
    return value
  })
}

/**
 * Decode a JSON string, as encoded by `encodeJSON`, including bigint support.
 * Note that the functions aren't invertible, as `encodeJSON` discards
 * `undefined`.
 *
 * @param input a string output from `encodeJSON`
 */
export function decodeJSON(input: string): unknown {
  return JSON.parse(input, (_, value) =>
    value !== null && typeof value === "object" && "B_I_G_I_N_T" in value
      ? BigInt(value.B_I_G_I_N_T)
      : value
  )
}

/**
 * Determine which Ethereum network should be used based on the .env file
 */
export function getEthereumNetwork(): EVMNetwork {
  const ethereumNetwork = process.env.ETHEREUM_NETWORK?.toUpperCase()

  if (ethereumNetwork === "GOERLI") {
    return GOERLI
  }

  // Default to mainnet
  return ETHEREUM
}

export function isProbablyEVMAddress(str: string): boolean {
  if (normalizeHexAddress(str).startsWith("0x") && str.length === 42) {
    return true
  }
  return false
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-5)}`
}

export const getNumericStringValueFromBigNumber = (
  value: BigNumber,
  tokenDecimals: number
): string => {
  return Number(value.toBigInt() / 10n ** BigInt(tokenDecimals)).toString()
}

export const numberTo32BytesHex = (value: string, decimals: number): string => {
  const withDecimals = BigInt(value) * 10n ** BigInt(decimals)
  const hex = utils.hexlify(withDecimals)
  return hex
}

export const isMaxUint256 = (amount: BigNumber | bigint | string): boolean => {
  return ethers.BigNumber.from(amount).eq(ethers.constants.MaxUint256)
}

/**
 * Converts a string of hexidecimals bytes to ascii text
 */
export const hexToAscii = (hex_: string): string => {
  const hex = hex_.toString() // force conversion
  let str = ""
  for (let i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  return str.replace("\x00", "")
}

export const wait = (ms: number): Promise<void> =>
  new Promise<void>((r) => setTimeout(r, ms))

export const getUNIXTimestamp = (time = Date.now()): UNIXTime =>
  Math.floor(time / 1000)
