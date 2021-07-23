
import Networks from './networks'
import Transactions from './transactions'
import Accounts from './accounts'
import { apiStubs } from './temp-stubs'
import EthereumBalances  from './balances/ethereum'
import ObsStore from './lib/ob-store'
import getFiatValue from './lib/getFiatValues.js'
import { DEFAULT_STATE } from './constants/default-state'


export default class Main {

  constructor (state = DEFAULT_STATE) {
    const { accountsMetaData, balances, networks, supportedChains, transactions } = state
    const { providers } = this.network = new Networks({ networks })
    this.transactions = new Transactions({
      state: transactions,
      provider: providers.ethereum.selcted,
      getFiatValue,
    })
    // this.keys = new Keys(state.keys || {})
    // const balances = this.balances = new Balances({ state: balances, providers })

    // this is temporary
    this.ethereumBalances = new EthereumBalances({ provider: providers.ethereum.selcted })

    // this.userPrefernces = new ObsStore(state.userPrefernces || {})

    this.accounts = new Accounts({
      getTransactionHistory: this.transactions.getHistory.bind(this.transactions),
      balances: this.ethereumBalances,
      accountsMetaData,
    })
    this._subscriptionIds = {}
  }


  /*
    Returns a object containing all api methods for use
  */
  getApi () {
    return apiStubs
    // return {
    //   '/accounts/': {
    //     GET: this.accounts.get.bind(this.accounts),
    //     POST: this._import.bind(this),
    //     subscribe: this.accounts.subscribe.bind(this.accounts),
    //   },
    // }
  }

  registerSubscription ({route, params, handler, id}) {
    if (!this._subscriptionIds[`${route}${JSON.stringify(params)}`]) {
      this._subscriptionIds[`${route}${JSON.stringify(params)}`] = []
    }
    this._subscriptionIds[`${route}${JSON.stringify(params)}`].push({handler, id})
  }
  async _import ({ address, data, type, name}) {
    if (data) this.keys.import({type, data, name})
    if (!data) return await this.accounts.add(address)
  }


}