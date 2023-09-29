import {
  AlchemyProvider,
  Network,
  showThrottleMessage,
} from "@ethersproject/providers"
import { ConnectionInfo } from "@ethersproject/web"

export default class TahoAlchemyProvider extends AlchemyProvider {
  static override getUrl(network: Network, apiKey: string): ConnectionInfo {
    let host = null
    switch (network.name) {
      case "sepolia":
        host = "eth-sepolia.g.alchemy.com/v2/"
        break
      default:
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
