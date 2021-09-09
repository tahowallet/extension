import ObsStore from "../lib/ob-store"
import EtherumNetworkProvider from "./ethereum"
import { NETWORK_ERRORS } from "../constants/errors"
import Logger from "../lib/logger"

export const providers = {
  ethereum: EtherumNetworkProvider,
}

/*
  manages all networks and currently selected networks

  STATE:
  [
      selected: true,
      type: NETWORK_TYPES.ethereum,
      name: 'Ethereum Main Net',
      endpoint: 'wss://eth-mainnet.ws.alchemyapi.io/v2/8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa',

  ]
*/

export interface NetworkInfo {
  selected: boolean
  type: string
  name: string
  endpoint: string
}

export type NetworksState = NetworkInfo[]

export default class Network {
  state: ObsStore<NetworksState>

  providers: any // TODO replace with a generic provider type

  constructor(networks: NetworkInfo[]) {
    this.state = new ObsStore(networks)
    this.providers = networks.reduce((acc, { type, endpoint, selected }) => {
      if (type in providers) {
        if (!acc[type]) {
          acc[type] = {}
        }
        acc[type][endpoint] = new providers[type](endpoint)
        if (selected) {
          acc[type].selected = acc[type][endpoint]
        }
      }
      return acc
    }, {})
  }

  /*
    adds network to state and creates a provider
  */

  async add(newNetwork: NetworkInfo) {
    const networks = this.state.getState()

    if (!(newNetwork.type in providers)) {
      throw new Error(NETWORK_ERRORS.UNSUPORTED_NETWORK)
    }
    networks.push(newNetwork)
    try {
      const { type, endpoint } = newNetwork
      if (!this.providers[type]) this.providers.type = {}
      this.providers[type][endpoint] = new providers[type]({ endpoint })
      this.providers[type].selected = this.providers[type][endpoint]
    } catch (e) {
      Logger.error(e)
    }
    this.state.putState(networks)
  }

  /*
    returns a full list of all networks
  */
  async get() {
    return this.state.getState()
  }
}
