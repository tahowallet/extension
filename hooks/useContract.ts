import { useCallback } from "react"
import { ethers } from "ethers"
import { useWeb3React } from "@web3-react/core"

export default (): any => {
  const { chainId } = useWeb3React()

  const getContract = useCallback(
    async (address, abi) => {
      if (chainId) {
        await window.ethereum.enable()
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        return new ethers.Contract(address, abi, signer)
      }
      const provider = new ethers.providers.JsonRpcProvider("some rpc url here")
      return new ethers.Contract(address, abi, provider)
    },
    [chainId]
  )

  return { getContract }
}
