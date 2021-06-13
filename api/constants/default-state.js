import { NETWORK_TYPES } from './index.js'

export const DEFAULT_STATE = {
  accountsMetaData: [],
  networks: [
    {
      selcted: true,
      type: NETWORK_TYPES.ethereum,
      name: 'rinkeby',
      enpoint: 'https://eth-rinkeby.alchemyapi.io/v2/_Kk5gA_dGwpJYOkb8khCKS0GJI6seNrc',
    }
  ],
}