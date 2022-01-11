import { AlchemyProvider, BaseProvider } from "@ethersproject/providers"
import { ethers, logger } from "ethers"
import { getNetwork } from "@ethersproject/networks"
import { TransactionDescription } from "ethers/lib/utils"
import { getTokenBalances, getTokenMetadata } from "./alchemy"
import { getEthereumNetwork } from "./utils"
import { AccountBalance } from "../accounts"
import { SmartContractFungibleAsset } from "../assets"

export const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function transferFrom(address from, address to, uint amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "event Approval(address indexed owner, address indexed spender, uint amount)",
]

export const ERC20_INTERFACE = new ethers.utils.Interface(ERC20_ABI)

export const ERC2612_ABI = ERC20_ABI.concat([
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
])

export const ERC2612_INTERFACE = new ethers.utils.Interface(ERC2612_ABI)

const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

const alchemyProvider = new AlchemyProvider(
  getNetwork(Number(getEthereumNetwork().chainID)),
  ALCHEMY_KEY
)

/*
 * Get an account's balance from an ERC20-compliant contract.
 */
export async function getBalance(
  provider: BaseProvider,
  tokenAddress: string,
  account: string
): Promise<BigInt> {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

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
  address: string
): Promise<AccountBalance[]> {
  if (tokens.length === 0) {
    return [] as AccountBalance[]
  }

  const tokenBalances = await getTokenBalances(
    provider,
    address,
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
        address,
        network: getEthereumNetwork(), // TODO track networks outside of .env file
        retrievedAt: Date.now(),
        dataSource: "alchemy",
      } as AccountBalance
      return acc.concat([accountBalance])
    },
    []
  )
}

export function parseERC20Tx(
  input: string
): TransactionDescription | undefined {
  try {
    return ERC20_INTERFACE.parseTransaction({
      data: input,
    })
  } catch (err) {
    return undefined
  }
}

export const getERC20TokenMetadata = async (
  address: string
): Promise<SmartContractFungibleAsset | null> => {
  try {
    const tokenMetadata = await getTokenMetadata(alchemyProvider, address)
    return tokenMetadata
  } catch (err) {
    logger.warn("Couldn't find token with specified address", address)
  }
  return null
}

// TODO get token balances of a many token contracts for a particular account the slow way, cache
// TODO get price data from 0xAPI
// TODO export a function that can take a tx and return any involved ERC-20s using traces
// TODO export a function that can simulate an unsigned transaction and return the token balance changes
