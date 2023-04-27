// Checks the chainId. Not needed in final version of the code.

import Web3 from "web3"

async function getChainId() {
  const provider = new Web3.providers.HttpProvider("http://localhost:8545")
  const web3 = new Web3(provider)
  const chainId = await web3.eth.getChainId()
  // eslint-disable-next-line no-console
  console.log(`Chain ID: ${chainId}`)
}

getChainId()
