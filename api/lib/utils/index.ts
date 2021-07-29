export function idGenerator(start?: number) {
  let index = start || 1
  return () => index++
}

export function createEthProviderWrapper(provider: any) {
  return new Proxy(provider, {
    get: (_, method) => {
      if (method === "provider") return provider
      return async (...params) => {
        return await provider.request({ method, params })
      }
    },
  })
}

export function weiToEth(value: string | number): number {
  return (typeof value === "number" ? value : parseInt(value)) / 10e17
}

export function transactionFee(
  gas: string | number,
  gasPrice: string | number
): number {
  return (
    (typeof gas === "number" ? gas : parseInt(gas)) *
    (typeof gasPrice === "number" ? gasPrice : parseInt(gasPrice))
  )
}
