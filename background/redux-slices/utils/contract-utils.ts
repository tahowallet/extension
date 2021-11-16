import { AlchemyProvider, getNetwork } from "@ethersproject/providers"
import { Contract, ethers } from "ethers"
import { getEthereumNetwork } from "../../lib/utils"

export function getAlchemyProvider(): AlchemyProvider {
  const provider = new AlchemyProvider(
    getNetwork(Number(getEthereumNetwork().chainID)),
    process.env.ALCHEMY_KEY
  )
  return provider
}

export const getContract = async (
  address: string,
  abi: any[]
): Promise<Contract> => {
  const provider = getAlchemyProvider()
  return new ethers.Contract(address, abi, provider)
}
