import useContract from "../hooks/useContract"

import { DISTRIBUTOR_ABI } from "./abi"

const useDistributorContract = (): any => {
  const { getContract } = useContract()

  const getDistributorContract = async () => {
    await getContract("0x123", DISTRIBUTOR_ABI)
  }

  const claimTally = async () => {
    const contract: any = await getDistributorContract()

    // What is and how to get index?
    // How do we know the amount
    // How to get the merkleProof

    const args = [index, account, amount, merkleProof]

    await contract.claim(...args)
  }
  return {
    claimTally,
  }
}

export default useDistributorContract
