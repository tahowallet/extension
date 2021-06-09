// TODO: once build is properly set up dont use playground!!
import { TransactionController } from '../playground/transactions'
import ObsStore from '../lib/ob-store'


export default class Transactions {
  constructor ({ state }) {
    this.state = new ObsStore(state)
  }

  getApi() {
    return {}
  }

}