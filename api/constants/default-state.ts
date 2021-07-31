import { NETWORK_TYPES } from "./index"
import { NetworkFungibleAsset } from "../types"

// Disabled while we figure out how we want to move here.
// eslint-disable-next-line import/prefer-default-export
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
  tokensToTrack: [
    {
      name: "Dai Stablecoin",
      symbol: "DAI",
      decimals: 18,
      homeNetwork: {
        name: "Ethereum Main Net",
        baseAsset: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        family: "EVM",
        chainId: "1",
      },
      contractAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
    } as NetworkFungibleAsset,
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      homeNetwork: {
        name: "Ethereum Main Net",
        baseAsset: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        family: "EVM",
        chainId: "1",
      },
      contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    } as NetworkFungibleAsset,
  ],
}
