
// import { Network } from './network'
// import { Transactions } from './transactions'
// import { Keys } from './keys'
// import { Balances } from './balances'
//



export default class Main {

  constructor (state) {
    // this.network = new Network(state.network || {})
    // this.transactions = new Transactions(state.transactions || {})
    // this.keys = new Keys(state.keys || {})
    // this.balances = new Balances(state.balances || {})
  }


  /*
    Returns a object containing all api methods for use
  */
  getApi () {
    return {
      setTest: async (v) => {
        return !!(this.test = v)
      },
      getTest: async () => this.test
    }
  }


}