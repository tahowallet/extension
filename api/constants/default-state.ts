import { NETWORK_TYPES } from "./index"

export const DEFAULT_STATE = {
  accounts: [],
  networks: [
    {
      selected: true,
      type: NETWORK_TYPES.ethereum,
      name: "Ethereum Main Net",
      endpoint:
        "wss://eth-mainnet.ws.alchemyapi.io/v2/8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa",
    },
  ],
  transactions: {},
}
