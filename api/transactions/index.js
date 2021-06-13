import { TransactionController } from '@mekamittens/controllers/transactions'
import ObsStore from '../lib/ob-store.js'
import { createEthProviderWrapper } from '../lib/utils'


export default class Transactions {
  constructor ({ state, provider }) {
    this.state = new ObsStore(state)
    this.query = createEthProviderWrapper(provider)
  }

  // temp history
  async getHistory (address,) {
    const blockNumer = ParseInt(await this.query.eth_blockNumber())
    // aprox. 3 weeks of blocks would be nice if we
    // could just have creation time on accounts
    const fromBlock =  blockNumer - 10e3
    const toAddress = fromAddress = address
    const toTransfers = this.query.alchemy_getAssetTransfers({
      fromBlock,
      toBlock,
      toAddress,
    })
    const fromTransfers = this.query.alchemy_getAssetTransfers({
      fromBlock,
      toBlock,
      fromAddress,
    })
    return [...toTransfers, ...fromTransfers].sort((txA, txB) => {
      return ParseInt(txA.blockNum) - ParseInt(txB.blockNum)
    })
  }
}