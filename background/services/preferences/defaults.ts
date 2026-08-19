import { ETHEREUM, MINUTE, USD } from "../../constants"

export const DEFAULT_AUTOLOCK_INTERVAL = 60 * MINUTE

const defaultPreferences = {
  tokenLists: {
    autoUpdate: false,
    urls: [
      // The Taho community-curated list, served from Taho-controlled
      // hosting. Public IPFS gateways challenge browser user agents, so the
      // ipfs:// form of this list is unreachable from the extension itself.
      "https://tokens.taho.xyz/tokens.json",
      "https://tokens.uniswap.org", // the Uniswap default list
      "https://wrapped.tokensoft.eth.limo", // Wrapped tokens
      "https://tokenlist.aave.eth.limo", // Aave-listed tokens and interest-bearing assets
      "https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json", // Compound-listed tokens and interest-bearing assets
      "https://static.optimism.io/optimism.tokenlist.json", // Superchain (Optimism, Base, etc.) Default Tokens
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
  autoLockInterval: DEFAULT_AUTOLOCK_INTERVAL,
  shouldShowNotifications: false,
  showTestNetworks: true,
}

export default defaultPreferences
