import {
  AlchemyProvider,
  Network,
  showThrottleMessage,
} from "@ethersproject/providers"
import { ConnectionInfo } from "@ethersproject/web"

// We want to add Sepolia to the list of Alchemy-supported chains. This will
// allow the extension to fill the list of historical transactions on that
// chain.
// We can't just add `SEPOLIA` to `ALCHEMY_SUPPORTED_CHAIN_IDS` because the
// `@ethersproject/providers@5.7.2` package that we use as a project dependency
// does not support Sepolia yet (no `sepolia` case in the `getUrl` function of
// `./src.ts/alchemy-provider.ts`). The support is planned to be added in the
// upcoming patch, but as it's release date is unknown, we're adding the Sepolia
// support by creating `TahoAlchemyProvider` class that handles this case.
// In the future we may want to add there another case, for `arbitrum-sepolia`,
// but we can't do that at this moment, as Alchemy does not offer an RPC for
// Arbitrum Sepolia yet.
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
