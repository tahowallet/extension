// TODO We'll need to replace all of this with fixed-point math and structured
// currency handling

import { transactionFee, weiToEth } from '../lib/utils'


interface LooseTransaction {
  local: any
  hash: string
  to: string
  from: string
  blockNumber: string | number
  value: string | number
  gasPrice: string | number
  gas: string | number
}

type PartialTransaction = Pick<LooseTransaction, 'local' | 'hash' | 'to' | 'from' | 'blockNumber'>

interface EthAndFiatAmount {
  eth: string
  fiat: string
}

type FormattedTransaction = PartialTransaction & {
  amount: EthAndFiatAmount
  transactionFee: EthAndFiatAmount
  gasPrice: EthAndFiatAmount
  total: EthAndFiatAmount
}

function weiAmountToEthAndFiatAmount(amount: string | number, fiatPrice: number) : EthAndFiatAmount {
  let wei = typeof amount === 'number' ? amount : parseInt(amount)
  return {
    eth: weiToEth(wei).toString(8),
    fiat: (fiatPrice * weiToEth(wei)).toFixed(2)
  }
}

export function formatTransaction (transaction, fiatPrice : number) {
  const { local, hash, to, from, value, gasPrice, gas, blockNumber } = transaction
  return {
    local,
    hash,
    to,
    from,
    blockNumber,
    amount: weiAmountToEthAndFiatAmount(value, fiatPrice),
    transactionFee: weiAmountToEthAndFiatAmount(transactionFee(gasPrice, gas), fiatPrice),
    gasPrice: weiAmountToEthAndFiatAmount(gasPrice, fiatPrice),
    total: weiAmountToEthAndFiatAmount(value + transactionFee(gasPrice, gas), fiatPrice)
  }
}
