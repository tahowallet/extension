
import Networks from './networks'
// import Transactions from './transactions'
import Accounts from './accounts/'
// import { Keys } from './keys'
// import { Balances } from './balances'
import ObsStore from './lib/ob-store'
import DEFAULT_STATE from './constants/default-state'


export default class Main {

  constructor (state) {
    const { accountMetaData, balances, networks, supportedChains } = state
    const { providers } = this.network = new Network({ networks })
    // this.transactions = new Transactions(state.transactions || {})
    // this.keys = new Keys(state.keys || {})
    // const balances = this.balances = new Balances({ state: balances, providers })

    // this is temporary
    this.ethereumBalances = new EthereumBalances({ providers.selcted})

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
    if (!data) return await this.accounts.add(address)
  }


}