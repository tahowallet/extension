import { BaseProvider, Provider } from "@ethersproject/providers"
import { BigNumber, ethers } from "ethers"

import {
  Multicall,
  ContractCallContext,
  ContractCallResults,
} from "ethereum-multicall"

import {
  EventFragment,
  Fragment,
  FunctionFragment,
  TransactionDescription,
} from "ethers/lib/utils"
import { SmartContractAmount, SmartContractFungibleAsset } from "../assets"
import { EVMLog, EVMNetwork, SmartContract } from "../networks"
import { HexString } from "../types"
import { AddressOnNetwork } from "../accounts"

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
 * Information bundle from an ostensible ERC20 transfer log using Tally types.
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

const makeTokenGroups = (tokenAddresses: HexString[]): HexString[][] => {
  const maxPerMulticall = 500 // items per chunk

  const tokenGroups: Array<HexString[]> = []

  tokenAddresses.forEach((item, index) => {
    const groupIndex = Math.floor(index / maxPerMulticall)

    if (!tokenGroups[groupIndex]) {
      tokenGroups[groupIndex] = [] // start a new chunk
    }

    tokenGroups[groupIndex].push(item)
  })

  return tokenGroups
}

const makeBalanceOfCallContext = (
  tokenAddress: HexString,
  accountAddress: HexString
) => ({
  reference: tokenAddress,
  contractAddress: tokenAddress,
  abi: [
    {
      name: "balanceOf",
      type: "function",
      inputs: [{ name: "address", type: "address" }],
      outputs: [{ name: "balance", type: "uint256" }],
      stateMutability: "view",
    },
  ],
  calls: [
    {
      reference: "balanceOf",
      methodName: "balanceOf",
      methodParameters: [accountAddress],
    },
  ],
})

const formatMulticallBalanceOfResults = (
  results: ContractCallResults,
  network: EVMNetwork
) =>
  Object.entries(results.results).flatMap(([contractAddress, result]) => {
    if (result.callsReturnContext[0].success === false) {
      // ignore unsuccessful calls
      return []
    }
    const balanceOfResponse: { type: "BigNumber"; hex: HexString } =
      result.callsReturnContext[0].returnValues[0]

    if (balanceOfResponse.hex === "0x00") {
      // ignore 0 balances
      return []
    }

    return {
      amount: BigInt(BigNumber.from(balanceOfResponse.hex).toString()),
      smartContract: {
        contractAddress,
        homeNetwork: network,
      },
    }
  })

export async function getTokenBalances(
  { address, network }: AddressOnNetwork,
  tokenAddresses: HexString[],
  provider: Provider
): Promise<SmartContractAmount[]> {
  const tokenGroups = makeTokenGroups(tokenAddresses)

  const multicall = new Multicall({
    // fixes a type mismatch here because ethereum-multicall is using an older version of ethers than we are
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethersProvider: provider as any,
    tryAggregate: true,
  })

  const toReturn: SmartContractAmount[] = []
  await Promise.all(
    tokenGroups.map(async (tokenAddressGroup) => {
      const contractCallContext: ContractCallContext[] = []
      tokenAddressGroup.forEach((tokenAddress) => {
        contractCallContext.push(
          makeBalanceOfCallContext(tokenAddress, address)
        )
      })
      const results = await multicall.call(contractCallContext)
      const amounts = formatMulticallBalanceOfResults(results, network)
      toReturn.push(...amounts)
    })
  )

  return toReturn
}
