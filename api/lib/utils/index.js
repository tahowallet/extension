export function idGenerator(start) {
  let index = start || 0
  return () => index++
}


export function createEthProviderWrapper (provider) {
  return new Proxy(provider, {
    get: (_, method) => {
      return async (...params) => {
        return await provider.request({ method, params })
      }
    }
  })
}
