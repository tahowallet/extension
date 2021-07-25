export function idGenerator(start? : number) {
  let index = start || 1
  return () => index++
}

export function createEthProviderWrapper(provider : any) {
  return new Proxy(provider, {
    get: (_, method) => {
      if (method === 'provider') return provider
      return async (...params) => {
        return await provider.request({ method, params })
      }
    }
  })
}

export const weiToEth = new Proxy(function weiToEth (value : any) {
  return (parseInt(value) / 10e17)
}, {
  get: (f : (any) => any, key : string) => {
    switch(key) {
      case 'transactionFee':
        return (gasPrice, gas) => f((parseInt(gasPrice) * parseInt(gas)))
      default:
        return f
    }
  }
})
