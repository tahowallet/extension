import ObsStore from '../lib/ob-store'
import EtherumNetworkProvider from './ethereum'
import { NETWORK_ERRORS } from '../constants/errors'



export const providers = {
  ethereum: EtherumNetworkProvider,
}

/*
  manages all networks and currently selected networks
*/

export default class Network {
  constructor ({ networks }) {
    this.store = new ObsStore(networks)
    this.providers = networks.reduce((agg, { type, endpoint, selcted }) => {
      if (type in providers) {
        if (!agg[type]) agg[type] = {}
        agg[type][endpoint] = new providers[type]({ endpoint })
        if (selcted) agg[type].selcted = agg[type][endpoint]
      }
      return agg
    }, {})
  }

  /*
    add's network to state and creates a provider
  */

  async add (newNetwork) {
    const networks = this.store.getState()
    if (!(newNetwork.type in providers)) throw new Error(NETWORK_ERRORS.UNSUPORTED_NETWORK)
    networks.push(newNetwork)
    try {
      const { type, endpoint }
      if (!this.providers[type]) this.providers.type = {}
      this.providers[type][endpoint] = new providers[type]({ endpoint })
      this.providers[type].selcted = this.providers[type][endpoint]
    }
    this.store.putState(networks)
  }

  /*
    returns a full list of all networks
  */
  async get () {
    return this.store.getState()
  }

  async delete () {
  }

  async select () {

  }
}