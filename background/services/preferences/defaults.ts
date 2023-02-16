import { ETHEREUM, USD } from "../../constants"
import { storageGatewayURL } from "../../lib/storage-gateway"
import { Preferences } from "./types"

const defaultPreferences: Preferences = {
  tokenLists: {
    autoUpdate: false,
    urls: [
      storageGatewayURL(
        "ipfs://bafybeigtlpxobme7utbketsaofgxqalgqzowhx24wlwwrtbzolgygmqorm"
      ).href, // the Taho community-curated list
      "https://gateway.ipfs.io/ipns/tokens.uniswap.org", // the Uniswap default list
      "https://meta.yearn.finance/api/tokens/list", // the Yearn list
      "https://messari.io/tokenlist/messari-verified", // Messari-verified projects
      "https://wrapped.tokensoft.eth.limo", // Wrapped tokens
      "https://tokenlist.aave.eth.limo", // Aave-listed tokens and interest-bearing assets
      "https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json", // Compound-listed tokens and interest-bearing assets
      "https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json", // Polygon Default Tokens
      "https://static.optimism.io/optimism.tokenlist.json", // Optimism Default Tokens
      "https://bridge.arbitrum.io/token-list-42161.json", // Arbitrum Default tokens
      "https://raw.githubusercontent.com/traderjoe-xyz/joe-tokenlists/1722d8c47a728a64c8dca8ac160b32cf39c5e671/mc.tokenlist.json", // Trader Joe tokens
      "https://tokens.pancakeswap.finance/pancakeswap-default.json", // PancakeSwap Default List
    ],
  },
  currency: USD,
  defaultWallet: false,
  selectedAccount: {
    address: "",
    network: ETHEREUM,
  },
  accountSignersSettings: [],
  analytics: {
    isEnabled: false,
    hasDefaultOnBeenTurnedOn: false,
  },
}

export default defaultPreferences
