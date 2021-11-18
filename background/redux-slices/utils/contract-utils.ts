import { Provider, AlchemyProvider, getNetwork } from "@ethersproject/providers"
import { Contract, ethers } from "ethers"
import { getEthereumNetwork } from "../../lib/utils"

type ContractInterface = ContractElement[]

interface ContractElement {
  inputs: InputOutputData[]
  type: string
  stateMutability?: string
  name?: string
  anonymous?: boolean
  outputs?: InputOutputData[]
}

interface InputOutputData {
  internalType: string
  name: string
  type: string
  indexed?: boolean
}

export function getProvider(): Provider {
  const provider = new AlchemyProvider(
    getNetwork(Number(getEthereumNetwork().chainID)),
    process.env.ALCHEMY_KEY
  )
  return provider
}

export const getContract = async (
  address: string,
  abi: ContractInterface
): Promise<Contract> => {
  const provider = getProvider()
  return new ethers.Contract(address, abi, provider)
}
