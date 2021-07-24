// import { TransactionController } from '@mekamittens/controllers/transactions'
import ObsStore from "../lib/ob-store.js"
import { createEthProviderWrapper } from "../lib/utils"
import { formatTransaction } from "./utils"

/*
STATE
{
  address: { history: [], localTransctions: [] }
  lastBlock: '0x124'
}
*/

export default class Transactions {
  constructor({ state, provider, getFiatValue }) {
    this.state = new ObsStore(state || {})
    this.query = createEthProviderWrapper(provider)
    this.getFiatValue = getFiatValue
  }

  async getHistory(address) {
    const state = this.getState()
    if (!state[address]) {
      state[address] = { history: [], localTransctions: [] }
    }
    if (this.query.provider.endpoint.includes("mainnet.alchemyapi")) {
      const newTransactions = await this._getTransfers(address, blockNumber)
      state[address].history.push(newTransactions)
      state.lastBlock = this.lastBlock
      this.state.putState(state)
    }
    const orderdHistory = [
      ...state[address].history,
      ...state[address].localTransctions,
    ].sort((txA, txB) => {
      return parseInt(txA.blockNumber) - parseInt(txB.blockNumber)
    })
    return orderdHistory
  }

  async _getTransfers(address, toBlock = "latest") {
    const blockNumber = parseInt(await this.query.eth_blockNumber())
    let fromBlock =
      this.lastBlock || `0x${(blockNumber - 10e3 * 3).toString(16)}`

    const fiatValue = await this.getFiatValue()
    const toAddress = address
    const fromAddress = address
    // get transactions to the address
    const toTransfers = await this.query.alchemy_getAssetTransfers({
      fromBlock,
      toBlock,
      toAddress,
      excludeZeroValue: false,
    })
    // get transactions from the address
    const fromTransfers = await this.query.alchemy_getAssetTransfers({
      fromBlock,
      toBlock,
      fromAddress,
      excludeZeroValue: false,
    })
    // get actual transaction data for all transactions
    const resolvedTxs = await Promise.allSettled(
      [...(toTransfers.transfers || []), ...(fromTransfers.transfers || [])]
        .sort((txA, txB) => {
          return parseInt(txA.blockNum) - parseInt(txB.blockNum)
        })
        .map(async (transfer) => {
          try {
            const transaction = await this.query.eth_getTransactionByHash(
              transfer.hash
            )
            return formatTransaction(
              { local: false, ...transaction },
              fiatValue
            )
          } catch (e) {
            console.error(e)
          }
        })
    )

    // store last checked block for later
    this.lastBlock = blockNumber

    // prepare final list
    const transactions = []
    resolvedTxs.forEach((ptx) => transactions.push(ptx.value))
    return transactions
  }
}
