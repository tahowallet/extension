import { createEthProviderWrapper } from "../../../lib/utils"

/*

assetInfo = [{
  ticker: 'ETH',
  decimals: ,
  name: 'Ether'
  contractAdress?:
}]

*/

export default class EthereumBalances {
  query: any // TODO use a generic provider type

  constructor(provider: any) {
    this.query = createEthProviderWrapper(provider)
  }

  // async add ({ type, adress }) {

  // }

  /*
    temporarily only returns eth balance
  */

  async get(address) {
    return [
      {
        balance: (await this.query.eth_getBalance(address, "latest")) / 10e17,
        symbol: "ETH",
      },
    ]
  }

  // start () {

  // }

  // stop () {

  // }
}
