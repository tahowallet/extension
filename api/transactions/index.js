import { TransactionController } from '@mekamittens/controllers/transactions'
import ObsStore from '../lib/ob-store.js'
import { createEthProviderWrapper } from '../lib/utils'


export default class Transactions {
  constructor ({ state, provider }) {
    this.state = new ObsStore(state)
    this.query = createEthProviderWrapper(provider)
  }

  // temp history
  async getHistory (address, toBlock = 'latest') {
    const blockNumer = parseInt(await this.query.eth_blockNumber())
    // aprox. 36 weeks of blocks would be nice if we
    // could just have creation time on accounts
    const fromBlock =  `0x${(blockNumer - (10e3 * 12)).toString(16)}`
    const toAddress = address
    const fromAddress = address
    const toTransfers= await this.query.alchemy_getAssetTransfers({
      fromBlock,
      toBlock,
      toAddress,
      excludeZeroValue: false,
    })
    const fromTransfers = await this.query.alchemy_getAssetTransfers({
      fromBlock,
      toBlock,
      fromAddress,
      excludeZeroValue: false,
    })
    return [...toTransfers.transfers || [], ...fromTransfers.transfers || []].sort((txA, txB) => {
      return parseInt(txA.blockNum) - parseInt(txB.blockNum)
    })
  }
}