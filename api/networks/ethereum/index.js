import Provider from './provider'


/*
  should do caching
*/



export default class EthereumNetworkProvider extends Provider {
  constructor ({ endpoint }) {
    super({ endpoint })
  }
}