
import ObsStore from '../lib/ob-store'


import Network from './network'
import Transactions from './transactions'
import Accounts from './accounts'
// import { Keys } from './keys'
// import { Balances } from './balances'
//



export default class Main {

  constructor (state) {
    const { accountMetaData } = state
    const network = this.network = new Network(state.network || {})
    this.transactions = new Transactions(state.transactions || {})
    this.keys = new Keys(state.keys || {})
    const balances = this.balances = new Balances(state.balances || {})
    this.userPrefernces = new ObsStore(state.userPrefernces || {})

    this.accounts = new Accounts({
      getTransactionHistory: this.transactions.getHistory.bind(this.transactions),
      balances,
      accountsMetaData || [],
    })

  }


  /*
    Returns a object containing all api methods for use
  */
  getApi () {
    return {
      ...this.accounts.getApi()
    }
  }



}