import { utils } from "ethers"
import { normalizeHexAddress } from "@tallyho/hd-keyring"
import JSONBig from "json-bigint"

import { HexString } from "../../types"

export function normalizeEVMAddress(address: string | Buffer): HexString {
  return normalizeHexAddress(address)
}

export function convertToEth(value: string | number): string {
  if (value && value >= 1) {
    return utils.formatUnits(BigInt(value))
  }
  return ""
}

// BigInts are CUTTING EDGE and can't be saved natively in Redux / browser storage
export function jsonEncodeBigInt(input: unknown): string {
  return JSONBig({ useNativeBigInt: true }).stringify(input)
}

export function jsonDecodeBigInt(input: string): unknown {
  return JSONBig({ useNativeBigInt: true }).parse(input)
}
