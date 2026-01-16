import {
  AlchemyProvider,
  Network,
  showThrottleMessage,
} from "@ethersproject/providers"
import { ConnectionInfo } from "@ethersproject/web"

// Network host mappings for Alchemy's new g.alchemy.com domain.
// ethers v5.7.2 uses the old alchemyapi.io domain which is being decommissioned.
const ALCHEMY_NETWORK_HOSTS: Record<number, string> = {
  // Mainnets
  1: "eth-mainnet.g.alchemy.com/v2/", // Ethereum
  10: "opt-mainnet.g.alchemy.com/v2/", // Optimism
  137: "polygon-mainnet.g.alchemy.com/v2/", // Polygon
  42161: "arb-mainnet.g.alchemy.com/v2/", // Arbitrum One
  42170: "arbnova-mainnet.g.alchemy.com/v2/", // Arbitrum Nova
  8453: "base-mainnet.g.alchemy.com/v2/", // Base
  324: "zksync-mainnet.g.alchemy.com/v2/", // zkSync Era

  // Testnets
  11155111: "eth-sepolia.g.alchemy.com/v2/", // Ethereum Sepolia
  11155420: "opt-sepolia.g.alchemy.com/v2/", // Optimism Sepolia
  80002: "polygon-amoy.g.alchemy.com/v2/", // Polygon Amoy
  421614: "arb-sepolia.g.alchemy.com/v2/", // Arbitrum Sepolia
  84532: "base-sepolia.g.alchemy.com/v2/", // Base Sepolia
  300: "zksync-sepolia.g.alchemy.com/v2/", // zkSync Sepolia
}

// Override AlchemyProvider to use the new g.alchemy.com domain instead of
// the deprecated alchemyapi.io domain that ethers v5.7.2 uses.
export default class TahoAlchemyProvider extends AlchemyProvider {
  static override getUrl(network: Network, apiKey: string): ConnectionInfo {
    const host = ALCHEMY_NETWORK_HOSTS[network.chainId]

    if (!host) {
      // Fall back to ethers default for unknown networks
      return AlchemyProvider.getUrl(network, apiKey)
    }

    return {
      allowGzip: true,
      url: `https://${host}${apiKey}`,
      throttleCallback: () => {
        if (apiKey === "0") {
          showThrottleMessage()
        }
        return Promise.resolve(true)
      },
    }
  }
}
