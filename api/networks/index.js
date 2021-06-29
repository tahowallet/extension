import ObsStore from '../lib/ob-store'
import EtherumNetworkProvider from './ethereum'
import { NETWORK_ERRORS } from '../constants/errors'



export const providers = {
  ethereum: EtherumNetworkProvider,
}

/*
  manages all networks and currently selected networks

  STATE:
  [
      selcted: true,
      type: NETWORK_TYPES.ethereum,
      name: 'Ethereum Main Net',
      endpoint: 'wss://eth-mainnet.ws.alchemyapi.io/v2/8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa',

  ]

*/

export default class Network {
  constructor ({ networks }) {
    this.state = new ObsStore(networks)
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
    const networks = this.state.getState()

    if (!(newNetwork.type in providers)) {
      throw new Error(NETWORK_ERRORS.UNSUPORTED_NETWORK)
    }
    networks.push(newNetwork)
    try {
      const { type, endpoint } = newNetwork
      if (!this.providers[type]) this.providers.type = {}
      this.providers[type][endpoint] = new providers[type]({ endpoint })
      this.providers[type].selcted = this.providers[type][endpoint]
    } catch (e) {
      console.error(e)
    }
    this.state.putState(networks)
  }

  /*
    returns a full list of all networks
  */
  async get () {
    return this.state.getState()
  }

  async delete () {
  }

  async select () {

  }
}