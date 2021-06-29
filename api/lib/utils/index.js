export function idGenerator(start) {
  let index = start || 1
  return () => index++
}

export function wait (millTime) {
  return new Promise()
}

export function createEthProviderWrapper (provider) {
  return new Proxy(provider, {
    get: (_, method) => {
      if (method === 'provider') return provider
      return async (...params) => {
        return await provider.request({ method, params })
      }
    }
  })
}


export const weiToEth = new Proxy(function weiToEth (value) {
  return (parseInt(value) / 10e17)
}, {
  get: (f, key) => {
    switch(key) {
      case 'transactionFee':
        return (gasPrice, gas) => f((parseInt(gasPrice) * parseInt(gas)))
      default:
        return f
    }
  }
})
