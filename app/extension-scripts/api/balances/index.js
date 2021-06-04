import ObsStore from '../../lib/ob-store'
import Etherum from './ethereum'

const networks = {
  ethereum: Etherum,
}

/*
state = {
  accounts:
    [ { type: 'address'/'multiSig?', network: 'ethereum' } ]
  assets: [
      { symbol: 'ETH', lookup?: url, },
      ...
    ]
  }
}
*/
export default class Balances {
  constructor ({ state, providers, chains }) {
    this.store = new ObsStore(state)
    chains.forEach((chain) => {
      this[chain] = new networks[chain]({
        state: state[chain],
        provider: providers[chain]
      })
      this.chain.store.on('update', (state) => {
        const newChainState = {}
        newChainState[chain] = state
        this.store.updateState(newChainState)
      })
    })
  }

  /*
    Returns a object containing all api methods for use
  */
  getApi () {
    return {

    }
  }
}