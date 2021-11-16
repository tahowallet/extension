import { Provider } from "@ethersproject/abstract-provider"
import { AlchemyProvider, getNetwork } from "@ethersproject/providers"
import { Contract, ethers } from "ethers"
import { getEthereumNetwork } from "../../lib/utils"

function getProvider(): Provider {
  // I want this function to accept chainId and then do a search like
  // Networks[chainId] which returns an RPC URL
  const provider: Provider = new ethers.providers.JsonRpcProvider(
    "some rpc url here"
  )
  return provider
}

function getAlchemyProvider(): AlchemyProvider {
  const provider = new AlchemyProvider(
    getNetwork(Number(getEthereumNetwork().chainID)),
    process.env.ALCHEMY_KEY
  )
  return provider
}

const getContract = async (address: string, abi: any[]): Promise<Contract> => {
  const provider = getAlchemyProvider()
  return new ethers.Contract(address, abi, provider)
}

export { getProvider, getAlchemyProvider, getContract }
