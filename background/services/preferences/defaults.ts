import { USD } from "../../constants"
import { Preferences } from "./types"

export default {
  tokenLists: {
    autoUpdate: false,
    urls: [
      "https://gateway.ipfs.io/ipns/tokens.uniswap.org", // the Uniswap default list
      "https://yearn.science/static/tokenlist.json", // the Yearn list
      "https://messari.io/tokenlist/messari-verified", // Messari-verified projects
      "https://wrapped.tokensoft.eth.link", // Wrapped tokens
      "https://tokenlist.aave.eth.link", // Aave-listed tokens and interest-bearing assets
      "https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json", // Compound-listed tokens and interest-bearing assets
    ],
  },
  currency: USD,
  defaultWallet: true,
} as Preferences
