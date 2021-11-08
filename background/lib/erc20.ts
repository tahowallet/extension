import { AlchemyProvider, BaseProvider } from "@ethersproject/providers"
import { ethers } from "ethers"
import { getTokenBalances } from "./alchemy"
import { getEthereumNetwork } from "./utils"
import { AccountBalance, SmartContractFungibleAsset } from "../types"

/*
 * Get an account's balance from an ERC20-compliant contract.
 */
export async function getBalance(
  provider: BaseProvider,
  tokenAddress: string,
  account: string
): Promise<BigInt> {
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
  provider: AlchemyProvider,
  tokens: SmartContractFungibleAsset[],
  account: string
): Promise<AccountBalance[]> {
  if (tokens.length === 0) {
    return [] as AccountBalance[]
  }

  const tokenBalances = await getTokenBalances(
    provider,
    account,
    tokens.map((t) => t.contractAddress)
  )

  const assetByAddress = tokens.reduce<{
    [contractAddress: string]: SmartContractFungibleAsset
  }>((acc, asset) => {
    const newAcc = { ...acc }
    newAcc[asset.contractAddress.toLowerCase()] = asset
    return newAcc
  }, {})

  return tokenBalances.reduce(
    (
      acc: AccountBalance[],
      tokenDetail: { contractAddress: string; amount: bigint }
    ) => {
      const accountBalance = {
        assetAmount: {
          amount: tokenDetail.amount,
          asset: assetByAddress[tokenDetail.contractAddress.toLowerCase()],
        },
        account,
        network: getEthereumNetwork(), // TODO track networks outside of .env file
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
