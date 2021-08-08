import { ethers } from "ethers"
import { ETHEREUM } from "../constants"
import { AccountBalance, SmartContractFungibleAsset } from "../types"

const ALCHEMY_KEY = "8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa"

/*
 * Get an account's balance from an ERC20-compliant contract.
 */
export async function getBalance(
  tokenAddress: string,
  account: string
): Promise<BigInt> {
  const provider = new ethers.providers.AlchemyProvider(
    { name: "homestead", chainId: 1 },
    ALCHEMY_KEY
  )
  const abi = ["function balanceOf(address owner) view returns (uint256)"]
  const token = new ethers.Contract(tokenAddress, abi, provider)

  return BigInt((await token.balanceOf(account)).toString())
}

/*
 * Get multiple token balances for an account using Alchemy.
 *
 * If no token contracts are provided, no balances will be returned.
 */
export async function getBalances(
  tokens: SmartContractFungibleAsset[],
  account: string
): Promise<AccountBalance[]> {
  const provider = new ethers.providers.AlchemyProvider(
    { name: "homestead", chainId: 1 },
    ALCHEMY_KEY
  )

  if (tokens.length === 0) {
    return [] as AccountBalance[]
  }

  const params = [account, tokens.map((t) => t.contractAddress)]
  const json = await provider.send("alchemy_getTokenBalances", params)
  // TODO cover failed schema validation and other errors

  const assetByAddress = tokens.reduce((acc, asset) => {
    const newAcc = { ...acc }
    newAcc[asset.contractAddress.toLowerCase()] = asset
    return newAcc
  }, {})

  return json.tokenBalances.reduce(
    (acc: AccountBalance[], tokenDetail: any) => {
      const accountBalance = {
        assetAmount: {
          amount: BigInt(tokenDetail.tokenBalance || 0),
          asset: assetByAddress[tokenDetail.contractAddress.toLowerCase()],
        },
        account,
        network: ETHEREUM, // TODO go multi-network
        retrievedAt: Date.now(),
        dataSource: "alchemy",
      } as AccountBalance
      return acc.concat([accountBalance])
    },
    []
  )
}

// TODO get token balances of a many token contracts for a particular account the slow way, cache
// TODO get price data from 0xAPI
// TODO export a function that can take a tx and return any involved ERC-20s using traces
// TODO export a function that can simulate an unsigned transaction and return the token balance changes
