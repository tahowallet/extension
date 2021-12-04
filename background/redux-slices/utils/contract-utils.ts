import {
  Provider,
  AlchemyProvider,
  getNetwork,
  Web3Provider,
} from "@ethersproject/providers"
import { INTERNAL_PORT_NAME } from "@tallyho/provider-bridge-shared"
import TallyWindowProvider from "@tallyho/window-provider"
import { Contract, ethers, ContractInterface } from "ethers"
import { getEthereumNetwork } from "../../lib/utils"

export function getProvider(this: unknown): Provider {
  const port = browser.runtime.connect({ name: INTERNAL_PORT_NAME })

  const provider = new TallyWindowProvider({
    postMessage: port.postMessage,
    addEventListener: port.onMessage.addListener,
    removeEventListener: port.onMessage.removeListener,
    origin: window.location.origin,
  })

  // @ts-expect-error web3-react needs send() with a specific syntax. Not sure why but the lib falls trhough and uses that unmaintained implementation which collides with the ethers.js ExternalProvider type
  return new Web3Provider(provider)
}

export const getContract = async (
  address: string,
  abi: ContractInterface
): Promise<Contract> => {
  const provider = getProvider()
  return new ethers.Contract(address, abi, provider)
}
