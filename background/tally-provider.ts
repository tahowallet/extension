import { Web3Provider } from "@ethersproject/providers"
import { toHexChainID, EVMNetwork } from "./networks"

// Not sure the best place to put this in but it feels like it deserves its own file.
export default class TallyWeb3Provider extends Web3Provider {
  switchChain(network: EVMNetwork): Promise<unknown> {
    return this.send("wallet_switchEthereumChain", [
      {
        chainId: toHexChainID(network.chainID),
      },
    ])
  }
}
