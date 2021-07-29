// import { TransactionController } from '@mekamittens/controllers/transactions'
import ObsStore from "../lib/ob-store"
import { createEthProviderWrapper } from "../lib/utils"
import { formatTransaction } from "./utils"

/*
STATE
{
  address: { history: [], localTransactions: [] }
  lastBlock: 1234
}
*/

export interface TransactionsState {
  address?: {
    history: any[]
    localTransactions: any[]
  }
  lastBlock?: number
}

export default class Transactions {
  state: ObsStore<TransactionsState>

  query: any

  getFiatValue: () => Promise<number>

  lastBlock: number

  constructor(
    state: TransactionsState,
    provider: any,
    getFiatValue: () => Promise<number>
  ) {
    this.state = new ObsStore<TransactionsState>(state)
    this.query = createEthProviderWrapper(provider)
    this.getFiatValue = getFiatValue
  }

  async getHistory(address: string) {
    const state = this.state.getState()
    if (!state[address]) {
      state[address] = { history: [], localTransactions: [] }
    }
    if (this.query.provider.endpoint.includes("mainnet.alchemyapi")) {
      const newTransactions = await this._getTransfers(address)
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

  string

  async _getTransfers(address: string, toBlock: string | number = "latest") {
    const blockNumber = parseInt(await this.query.eth_blockNumber())
    const fromBlock =
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
    const transactions = (
      await Promise.allSettled(
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
              throw e
            }
          })
      )
    )
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value)

    // store last checked block for later
    this.lastBlock = blockNumber

    return transactions
  }
}
