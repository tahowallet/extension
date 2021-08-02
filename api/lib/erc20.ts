import { ethers } from "ethers"
import { SmartContractFungibleAsset } from "../types"

const ALCHEMY_KEY = "8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa"

/*
 * Get an account's balance from an ERC20-compliant contract.
 */
export async function getBalance(
  tokenAddress: string,
  account: string
): Promise<BigInt> {
  const provider = new ethers.providers.AlchemyProvider(ALCHEMY_KEY)
  const abi = ["function balanceOf(address owner) view returns (uint256)"]
  const token = new ethers.Contract(tokenAddress, abi, provider)

  return BigInt((await token.balanceOf(account)).toString())
}

/*
 * Get multiple token balances for an account using Alchemy.
 *
 * If no token contracts are provided, balances for the top 100 tokens by 24
 * hour volume will be returned.
 */
export async function getBalances(
  tokens: SmartContractFungibleAsset[],
  account: string
): Promise<{ [tokenAddress: string]: BigInt }> {
  const provider = new ethers.providers.AlchemyProvider(ALCHEMY_KEY)

  const params = [
    account,
    tokens.length > 0 ? tokens.map((t) => t.contractAddress) : "DEFAULT_TOKENS",
  ]
  const json = await provider.send("alchemy_getTokenBalances", params)
  // TODO cover failed schema validation and other errors

  return json.tokenBalances.reduce((acc: any, tokenDetail: any) => {
    acc[tokenDetail.contractAddress] = BigInt(tokenDetail.tokenBalance || 0)
    return acc
  }, {})
}

// TODO get token balances of a many token contracts for a particular account the slow way, cache
// TODO get price data from 0xAPI
// TODO export a function that can take a tx and return any involved ERC-20s using traces
// TODO export a function that can simulate an unsigned transaction and return the token balance changes
