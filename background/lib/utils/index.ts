import { utils } from "ethers"
import { normalizeHexAddress } from "@tallyho/hd-keyring"

import { HexString } from "../../types"

export function normalizeEVMAddress(address: string | Buffer): HexString {
  return normalizeHexAddress(address)
}

export function idGenerator(start?: number) {
  let index = start || 1
  return () => {
    index += 1
    return index
  }
}

export function createEthProviderWrapper(provider: any) {
  return new Proxy(provider, {
    get: (_, method) => {
      if (method === "provider") return provider
      return async (...params) => {
        return provider.request({ method, params })
      }
    },
  })
}

export function weiToEth(value: string | number): number {
  return (typeof value === "number" ? value : parseInt(value, 10)) / 10e17
}

export function convertToEth(value: string | number): string {
  if (value && value >= 1) {
    return utils.formatUnits(BigInt(value))
  }
  return ""
}

export function transactionFee(
  gas: string | number,
  gasPrice: string | number
): number {
  return (
    (typeof gas === "number" ? gas : parseInt(gas, 10)) *
    (typeof gasPrice === "number" ? gasPrice : parseInt(gasPrice, 10))
  )
}

// BigInt is a custom data type that can't be saved natively in Redux / Browser storage
export function jsonEncodeBigInt(input: unknown): string {
  return JSON.stringify(input, (_, value) =>
    typeof value === "bigint" ? { B_I_G_I_N_T: value.toString() } : value
  )
}

export function jsonDecodeBigInt(input: string): unknown {
  return JSON.parse(input, (_, value) =>
    value !== null && typeof value === "object" && "B_I_G_I_N_T" in value
      ? BigInt(value.B_I_G_I_N_T)
      : value
  )
}
