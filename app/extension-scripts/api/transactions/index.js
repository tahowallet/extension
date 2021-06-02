import { TransactionController } from 'mekamittens-controllers'
import ObsStore from '../../lib/ob-store'


export default class Transactions {
  constructor ({ state }) {
    this.state = new ObsStore(state)
  }

  getApi() {

  }

}