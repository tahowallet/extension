import { utils } from "ethers"
import { normalizeHexAddress } from "@tallyho/hd-keyring"
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

export function jsonEncodeBigInt(input: unknown): string {
  return JSON.stringify(input, (_, value) => {
    if (typeof value === "bigint") {
      return { B_I_G_I_N_T: value.toString() }
    }
    if (value === undefined) {
      return null
    }
    return value
  })
}

export function jsonDecodeBigInt(input: string): unknown {
  return JSON.parse(input, (_, value) =>
    value !== null && typeof value === "object" && "B_I_G_I_N_T" in value
      ? BigInt(value.B_I_G_I_N_T)
      : value
  )
}
