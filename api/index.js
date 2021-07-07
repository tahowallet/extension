
import Networks from './networks'
import Transactions from './transactions'
import Accounts from './accounts/'
import createKeyContext from './keys'
import EthereumBalances  from './balances/ethereum'
import ObsStore from './lib/ob-store'
import getFiatValue from './lib/getFiatValues'
import { DEFAULT_STATE } from './constants/default-state'

const keys = createKeyContext()

export default class Main {
  constructor (state = DEFAULT_STATE) {
    const { accountsMetaData, balances, networks, supportedChains, transactions } = state
    const { providers } = this.network = new Networks({ networks })
    this.transactions = new Transactions({
      state: transactions,
      provider: providers.ethereum.selcted,
      getFiatValue,
    })
    // const balances = this.balances = new Balances({ state: balances, providers })

    // this is temporary
    this.ethereumBalances = new EthereumBalances({ provider: providers.ethereum.selcted })

    // this.userPrefernces = new ObsStore(state.userPrefernces || {})

    this.accounts = new Accounts({
      getTransactionHistory: this.transactions.getHistory.bind(this.transactions),
      balances: this.ethereumBalances,
      accountsMetaData,
    })

  }


  /*
    Returns a object containing all api methods for use
  */
  getApi () {
    return {
      '/accounts/': {
        GET: this.accounts.get.bind(this.accounts),
        POST: this._import.bind(this),
      },
    }
  }


  async _import ({ address, data, type, name}) {
    // read only accounts will just be an address and not have data fields
    let newAddress
    if (data) {
      newAddress =  keys.import({ data, type, name })
    }

    return await this.accounts.add(newAddress || address)
  }


}