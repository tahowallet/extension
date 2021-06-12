// import ObsStore from '../lib/ob-store.js'
// import Etherum from './ethereum'

// const providedNetworks = {
//   ethereum: Etherum,
// }

// /*
// state = {
//   networks: []
//   assets: [
//       { symbol: 'ETH', lookup?: url, },
//       ...
//     ]
//   }
// }
// */
// export default class Balances extends ObsStore {
//   constructor ({ state, providers, getAccounts }) {
//     super(state)
//     this.networks = []
//     const { networks } = state
//     networks.forEach((chain) => {
//       this.networks.push(new providedNetworks[chain]({
//         state: state[chain],
//         provider: providers[chain]
//       }))
//     })
//   }

//   /*future behavior of this method is to take a list of accounts*/
//   async get ({address}) {
//     const balances = this.networks.reduce((agg, network) => {
//       agg.push(network.getBalnces(address))
//     }, [])
//   }

// }