import { BaseProvider, Provider } from "@ethersproject/providers"
import { BigNumber, ethers } from "ethers"

import {
  EventFragment,
  Fragment,
  FunctionFragment,
  TransactionDescription,
} from "ethers/lib/utils"
import { SmartContractAmount, SmartContractFungibleAsset } from "../assets"
import { EVMLog, SmartContract } from "../networks"
import { HexString } from "../types"
import { AddressOnNetwork } from "../accounts"
import {
  AggregateContractResponse,
  MULTICALL_ABI,
  MULTICALL_CONTRACT_ADDRESS,
} from "./multicall"

export const ERC20_FUNCTIONS = {
  allowance: FunctionFragment.from(
    "allowance(address owner, address spender) view returns (uint256)"
  ),
  approve: FunctionFragment.from(
    "approve(address spender, uint256 value) returns (bool)"
  ),
  balanceOf: FunctionFragment.from(
    "balanceOf(address owner) view returns (uint256)"
  ),
  decimals: FunctionFragment.from("decimals() view returns (uint8)"),
  name: FunctionFragment.from("name() view returns (string)"),
  symbol: FunctionFragment.from("symbol() view returns (string)"),
  totalSupply: FunctionFragment.from("totalSupply() view returns (uint256)"),
  transfer: FunctionFragment.from(
    "transfer(address to, uint amount) returns (bool)"
  ),
  transferFrom: FunctionFragment.from(
    "transferFrom(address from, address to, uint amount) returns (bool)"
  ),
}

const ERC20_EVENTS = {
  Transfer: EventFragment.from(
    "Transfer(address indexed from, address indexed to, uint amount)"
  ),
  Approval: EventFragment.from(
    "Approval(address indexed owner, address indexed spender, uint amount)"
  ),
}

export const ERC20_ABI = Object.values<Fragment>(ERC20_FUNCTIONS).concat(
  Object.values(ERC20_EVENTS)
)

export const ERC20_INTERFACE = new ethers.utils.Interface(ERC20_ABI)

export const ERC2612_FUNCTIONS = {
  permit: FunctionFragment.from(
    "permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)"
  ),
  nonces: FunctionFragment.from("nonces(address owner) view returns (uint256)"),
  DOMAIN: FunctionFragment.from("DOMAIN_SEPARATOR() view returns (bytes32)"),
}

export const ERC2612_ABI = ERC20_ABI.concat(Object.values(ERC2612_FUNCTIONS))

export const ERC2612_INTERFACE = new ethers.utils.Interface(ERC2612_ABI)

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

/**
 * Returns the metadata for a single ERC20 token by calling the contract
 * directly. Certain providers may support more efficient lookup strategies.
 */
export async function getMetadata(
  provider: BaseProvider,
  tokenSmartContract: SmartContract
): Promise<SmartContractFungibleAsset> {
  const token = new ethers.Contract(
    tokenSmartContract.contractAddress,
    ERC20_ABI,
    provider
  )

  const [symbol, name, decimals] = await Promise.all(
    [
      ERC20_FUNCTIONS.symbol,
      ERC20_FUNCTIONS.name,
      ERC20_FUNCTIONS.decimals,
    ].map(({ name: functionName }) => token.callStatic[functionName]())
  )

  return {
    ...tokenSmartContract,
    symbol,
    name,
    decimals,
  }
}

/**
 * Parses a contract input/data field as if it were an ERC20 transaction.
 * Returns the parsed data if parsing succeeds, otherwise returns `undefined`.
 */
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

/**
 * Information bundle from an ostensible ERC20 transfer log using Taho types.
 */
export type ERC20TransferLog = {
  contractAddress: string
  amount: bigint
  senderAddress: HexString
  recipientAddress: HexString
}

/**
 * Parses the given list of EVM logs, returning information on any contained
 * ERC20 transfers.
 *
 * Note that the returned data should only be considered valid if the logs are
 * from a known asset address; this function does not check the asset address,
 * it only tries to blindly parse each log as if it were an ERC20 Transfer
 * event.
 *
 * @param logs An arbitrary list of EVMLogs, some of which may represent ERC20
 *        `Transfer` events.
 * @return Information on any logs that were parsable as ERC20 `Transfer`
 *         events. This does _not_ mean they are guaranteed to be ERC20
 *         `Transfer` events, simply that they can be parsed as such.
 */
export function parseLogsForERC20Transfers(logs: EVMLog[]): ERC20TransferLog[] {
  return logs
    .map(({ contractAddress, data, topics }) => {
      try {
        const decoded = ERC20_INTERFACE.decodeEventLog(
          ERC20_EVENTS.Transfer,
          data,
          topics
        )

        if (
          typeof decoded.to === "undefined" ||
          typeof decoded.from === "undefined" ||
          typeof decoded.amount === "undefined"
        ) {
          return undefined
        }

        return {
          contractAddress,
          amount: (decoded.amount as BigNumber).toBigInt(),
          senderAddress: decoded.from,
          recipientAddress: decoded.to,
        }
      } catch (_) {
        return undefined
      }
    })
    .filter((info): info is ERC20TransferLog => typeof info !== "undefined")
}

export const getTokenBalances = async (
  { address, network }: AddressOnNetwork,
  tokenAddresses: HexString[],
  provider: Provider
): Promise<SmartContractAmount[]> => {
  const contract = new ethers.Contract(
    MULTICALL_CONTRACT_ADDRESS,
    MULTICALL_ABI,
    provider
  )

  const balanceOfCallData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [
    address,
  ])

  const response = (await contract.callStatic.tryBlockAndAggregate(
    // false === don't require all calls to succeed
    false,
    tokenAddresses.map((tokenAddress) => [tokenAddress, balanceOfCallData])
  )) as AggregateContractResponse

  return response.returnData.flatMap((data, i) => {
    if (data.success !== true) {
      return []
    }

    if (data.returnData === "0x00" || data.returnData === "0x") {
      return []
    }

    return {
      amount: BigInt(BigNumber.from(data.returnData).toString()),
      smartContract: {
        contractAddress: tokenAddresses[i],
        homeNetwork: network,
      },
    }
  })
}
