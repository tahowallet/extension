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



export function formatTransaction (transaction, fiatValue) {
  const { local, hash, to, from, value, gasPrice, gas, blockNumber } = transaction
  return {
    local,
    hash,
    to,
    from,
    blockNumber,
    amount: {
      eth: weiToEth(value).toString(8),
      fiat: (fiatValue * weiToEth(value)).toFixed(2).toString(),
    },
    transactionFee: {
      eth: weiToEth.transactionFee(gasPrice, gas).toString(8),
      fiat: (fiatValue * weiToEth.transactionFee(gasPrice, gas)).toFixed(2),
    },
    gasPrice: {
      eth: weiToEth(gasPrice).toString(8),
      fiat: fiatValue * weiToEth(gasPrice).toFixed(2)
    },
    total: {
      eth: (weiToEth.transactionFee(gasPrice, gas)+ weiToEth(value)).toString(8),
      fiat: (fiatValue * (weiToEth(value) + weiToEth.transactionFee(gasPrice, gas))).toFixed(2).toString(),
    },
  }
}