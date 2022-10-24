import { BigNumber } from "ethers"

// Forked from https://github.com/joshstevens19/ethereum-multicall

export interface AggregateContractResponse {
  blockNumber: BigNumber
  returnData: Array<{
    success: true
    returnData: string
  }>
}

// @TODO Handle chain-specific cases - but this contract should
// be good enough for all popular chains in the meantime
export const MULTICALL_CONTRACT_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11"

export const MULTICALL_ABI = [
  {
    constant: false,
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate",
    outputs: [
      { name: "blockNumber", type: "uint256" },
      { name: "returnData", type: "bytes[]" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "requireSuccess",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall2.Call[]",
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "tryBlockAndAggregate",
    outputs: [
      {
        internalType: "uint256",
        name: "blockNumber",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32",
      },
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool",
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall2.Result[]",
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
]
