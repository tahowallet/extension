import { BigNumber, utils } from "ethers"

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
  return utils.formatUnits(BigNumber.from(`${value}`).toBigInt())
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
