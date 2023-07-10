import { ethers } from "ethers"
import { debounce } from "lodash"
import assert from "assert"
import { AddressOnNetwork } from "../../accounts"
import {
  AggregateContractResponse,
  MULTICALL_ABI,
  MULTICALL_CONTRACT_ADDRESS,
} from "../../lib/multicall"

import ChainService from "../chain"
import NameService from "../name"

import { AddressOnNetworkAnnotation, EnrichedAddressOnNetwork } from "./types"
import { normalizeEVMAddress } from "../../lib/utils"
import { ETHEREUM, SECOND } from "../../constants"
import logger from "../../lib/logger"
import { sameNetwork } from "../../networks"
import { NormalizedEVMAddress } from "../../types"

type ResolveFn<T> = (value: T | PromiseLike<T>) => void
type RejectFn = (reason?: unknown) => void

function getUnresolvedPromise<T>(): [Promise<T>, ResolveFn<T>, RejectFn] {
  let resolver: undefined | ResolveFn<T>
  let rejecter: undefined | RejectFn

  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejecter = reject
  })

  assert(resolver)
  assert(rejecter)
  return [promise, resolver, rejecter]
}

const abi = [
  {
    inputs: [],
    name: "blockHeight",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32",
      },
    ],
    name: "ensResolve",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "node",
        type: "bytes32",
      },
    ],
    name: "ensReverseLookup",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "getBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address",
      },
    ],
    name: "isContract",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "name",
        type: "uint256",
      },
    ],
    name: "unsResolve",
    outputs: [
      {
        internalType: "string[]",
        name: "",
        type: "string[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "addr",
        type: "address",
      },
    ],
    name: "unsReverseLookup",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]
// TODO look up whether contracts are verified on EtherScan
// TODO ABIs

let batchId = 1
let lock = Promise.resolve()
let [batchResultLock, submitBatchResult, rejectBatchResult] =
  getUnresolvedPromise<
    Record<NormalizedEVMAddress, AddressOnNetworkAnnotation>
  >()

let batch: AddressOnNetwork[] = []

export async function batchResolveAddressAnnotation(
  chainService: ChainService
): Promise<void> {
  logger.info("batch:", batchId, batch)

  const runner = async () => {
    const provider = chainService.providerForNetworkOrThrow(ETHEREUM)

    const contract = new ethers.Contract(
      "0x36025f7396Fd7AB297cC83a9334a9Fb54532cC5d",
      abi,
      provider
    )

    const multicall = new ethers.Contract(
      MULTICALL_CONTRACT_ADDRESS,
      MULTICALL_ABI,
      provider
    )

    const addressesToFetchMap: Record<NormalizedEVMAddress, AddressOnNetwork> =
      Object.fromEntries(
        batch.map((account) => [normalizeEVMAddress(account.address), account])
      )

    const addressesToFetch = Object.keys(
      addressesToFetchMap
    ) as NormalizedEVMAddress[]

    logger.info(
      "Looking up addresses for enrichment",
      batchId,
      addressesToFetch,
      addressesToFetch.length
    )

    const callData = addressesToFetch.flatMap((addr) =>
      [
        contract.interface.encodeFunctionData("getBalance", [addr]),
        contract.interface.encodeFunctionData("isContract", [addr]),
        contract.interface.encodeFunctionData("ensReverseLookup", [
          ethers.utils.namehash(
            `${addr.substring(2).toLowerCase()}.addr.reverse`
          ),
        ]),
        contract.interface.encodeFunctionData("unsReverseLookup", [addr]),
      ].map((call) => [contract.address, call])
    )

    const response = (await multicall.callStatic.tryBlockAndAggregate(
      false,
      callData
    )) as AggregateContractResponse

    const blockNum = response.blockNumber

    const enrichedAddressesMap: Record<
      NormalizedEVMAddress,
      AddressOnNetworkAnnotation
    > = {}

    const allResults = response.returnData

    addressesToFetch.forEach((key, i) => {
      const addressOnNetwork = addressesToFetchMap[key]
      const { address, network } = addressesToFetchMap[key]
      const addressResults = allResults.slice(4 * i, 4 * i + 4)

      const [balance, isContract, ens] = [
        ["getBalance", addressResults[0].returnData],
        ["isContract", addressResults[1].returnData],
        ["ensReverseLookup", addressResults[2].returnData],
        ["unsReverseLookup", addressResults[3].returnData],
      ].map(
        ([fnName, data]) =>
          contract.interface.decodeFunctionResult(fnName, data)[0]
      )

      enrichedAddressesMap[key] = {
        balance: {
          address,
          assetAmount: { asset: network.baseAsset, amount: balance.toBigInt() },
          retrievedAt: Date.now(),
          dataSource: "local",
          network,
          blockHeight: blockNum.toBigInt(),
        },
        hasCode: isContract,
        nameRecord: {
          resolved: {
            nameOnNetwork: { name: ens, network },
            expiresAt: Date.now() + 10 * SECOND,
          },
          system: "ENS",
          from: { addressOnNetwork },
        },
        timestamp: Date.now(),
      }
    })

    logger.info("Batch processed:", batchId, "results:", enrichedAddressesMap)

    submitBatchResult(enrichedAddressesMap)

    batch = []
    batchId += 1
  }

  lock = runner()
    .catch((err) => {
      rejectBatchResult(err)
    })
    .finally(() => {
      batchResultLock = new Promise((resolve, reject) => {
        submitBatchResult = resolve
        rejectBatchResult = reject
      })
    })
}

const debouncedResolver = debounce(batchResolveAddressAnnotation, 500, {
  trailing: true,
  maxWait: 500,
})

const resolveAddress = async (
  chain: ChainService,
  _name: NameService,
  address: AddressOnNetwork
) => {
  // if we're already processing wait until finished
  await lock
  batch.push(address)

  debouncedResolver(chain)
  // Wait until the resolver actually runs
  const results = await batchResultLock

  const match = results[normalizeEVMAddress(address.address)]

  if (!match) {
    throw logger.buildError(
      "Could not enrich address: ",
      address,
      "successfully"
    )
  }

  return match
}

async function genericResolver(
  chainService: ChainService,
  nameService: NameService,
  addressOnNetwork: AddressOnNetwork
) {
  const { address, network } = addressOnNetwork
  const provider = chainService.providerForNetworkOrThrow(network)

  const [codeHex, balance, nameRecord] = await Promise.all([
    provider.getCode(address),
    chainService.getLatestBaseAccountBalance(addressOnNetwork),
    nameService.lookUpName(addressOnNetwork),
  ])

  return {
    balance,
    nameRecord,
    hasCode: codeHex !== "0x",
    timestamp: Date.now(),
  }
}

export async function enrichAddressOnNetwork(
  chainService: ChainService,
  nameService: NameService,
  addressOnNetwork: AddressOnNetwork
): Promise<EnrichedAddressOnNetwork> {
  const resolve = sameNetwork(addressOnNetwork.network, ETHEREUM)
    ? resolveAddress
    : genericResolver

  return {
    ...addressOnNetwork,
    annotation: await resolve(chainService, nameService, addressOnNetwork),
  }
}
