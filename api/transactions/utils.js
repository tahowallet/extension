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
