import { BigNumber, utils as ethersUtils } from "ethers"
import { Block as EthersBlock } from "@ethersproject/abstract-provider"
import { AlchemyProvider } from "@ethersproject/providers"

import {
  Transaction as EthersTransaction,
  UnsignedTransaction,
} from "@ethersproject/transactions"

import {
  AnyEVMTransaction,
  EIP1559Block,
  FungibleAsset,
  EVMNetwork,
  SignedEVMTransaction,
  TxParams,
} from "../../types"
import { ETHEREUM } from "../../constants"

/*
 * Parse a block as returned by a polling provider.
 */
export function blockFromEthersBlock(gethResult: EthersBlock): EIP1559Block {
  return {
    hash: gethResult.hash,
    blockHeight: gethResult.number,
    parentHash: gethResult.parentHash,
    difficulty: BigInt(gethResult.difficulty),
    timestamp: gethResult.timestamp,
    baseFeePerGas: gethResult.baseFeePerGas.toBigInt(),
    network: ETHEREUM,
  }
}

/*
 * Parse a block as returned by a websocket provider subscription.
 */
export function blockFromWebsocketBlock(
  incomingGethResult: unknown
): EIP1559Block {
  const gethResult = incomingGethResult as {
    hash: string
    number: string
    parentHash: string
    difficulty: string
    timestamp: string
    baseFeePerGas: string
  }

  return {
    hash: gethResult.hash,
    blockHeight: BigNumber.from(gethResult.number).toNumber(),
    parentHash: gethResult.parentHash,
    difficulty: BigInt(gethResult.difficulty),
    timestamp: BigNumber.from(gethResult.timestamp).toNumber(),
    baseFeePerGas: BigInt(gethResult.baseFeePerGas),
    network: ETHEREUM,
  }
}

export function ethersTxFromTx(tx: AnyEVMTransaction): EthersTransaction {
  const baseTx = {
    nonce: Number(tx.nonce),
    gasLimit: tx.gas ? BigNumber.from(tx.gas) : null,
    maxFeePerGas: tx.maxFeePerGas ? BigNumber.from(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigNumber.from(tx.maxPriorityFeePerGas)
      : null,
    to: tx.to,
    from: tx.from,
    data: tx.input,
    chainId: parseInt(tx.network.chainID, 10),
    value: BigNumber.from(tx.value),
  }
  if ((tx as SignedEVMTransaction).r !== undefined) {
    return {
      ...baseTx,
      r: (tx as SignedEVMTransaction).r,
      s: (tx as SignedEVMTransaction).s,
      v: (tx as SignedEVMTransaction).v,
    }
  }
  return baseTx
}

/*
 * Parse a transaction as returned by a websocket provider subscription.
 */
export function txFromWebsocketTx(
  websocketTx: unknown,
  asset: FungibleAsset,
  network: EVMNetwork
): AnyEVMTransaction {
  // These are the props we expect here.
  const tx = websocketTx as {
    hash: string
    to: string
    from: string
    gas: string
    gasPrice: string
    maxFeePerGas: string | undefined | null
    maxPriorityFeePerGas: string | undefined | null
    input: string
    r: string
    s: string
    v: string
    nonce: string
    value: string
    blockHash: string | undefined | null
    blockHeight: string | undefined | null
    blockNumber: number | undefined | null
    type: string | undefined | null
  }

  return {
    hash: tx.hash,
    to: tx.to,
    from: tx.from,
    gas: BigInt(tx.gas),
    gasPrice: BigInt(tx.gasPrice),
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigInt(tx.maxPriorityFeePerGas)
      : null,
    input: tx.input,
    r: tx.r || undefined,
    s: tx.s || undefined,
    v: BigNumber.from(tx.v).toNumber(),
    nonce: BigInt(tx.nonce),
    value: BigInt(tx.value),
    blockHash: tx.blockHash || undefined,
    blockHeight: tx.blockNumber || undefined,
    type:
      tx.type !== undefined
        ? (BigNumber.from(tx.type).toNumber() as AnyEVMTransaction["type"])
        : 0,
    asset,
    network,
  }
}

/*
 * Parse a transaction as returned by a polling provider.
 */
export function txFromEthersTx(
  tx: EthersTransaction & {
    blockHash?: string
    blockNumber?: number
    type?: number
  },
  asset: FungibleAsset,
  network: EVMNetwork
): AnyEVMTransaction {
  if (tx.hash === undefined) {
    throw Error("Malformed transaction")
  }
  if (tx.type !== 0 && tx.type !== 1 && tx.type !== 2) {
    throw Error(`Unknown transaction type ${tx.type}`)
  }

  const newTx = {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    nonce: BigInt(parseInt(tx.nonce.toString(), 10)),
    gas: tx.gasLimit.toBigInt(),
    gasPrice: tx.gasPrice ? tx.gasPrice.toBigInt() : null,
    maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toBigInt() : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? tx.maxPriorityFeePerGas.toBigInt()
      : null,
    value: tx.value.toBigInt(),
    input: tx.data,
    type: tx.type,
    blockHash: tx.blockHash || null,
    blockHeight: tx.blockNumber || null,
    network,
    asset,
  } as const // narrow types for compatiblity with our internal ones

  if (tx.r && tx.s && tx.v) {
    const signedTx = {
      ...newTx,
      r: tx.r,
      s: tx.s,
      v: tx.v,
    }
    return signedTx
  }
  return newTx
}

/*
 * Generate a partial transaction to be signed
 */

export async function createUnsignedTx(
  provider: AlchemyProvider,
  transaction: TxParams
): Promise<UnsignedTransaction> {
  return {
    // from: transaction.from,
    to: transaction.to,
    value: BigNumber.from(transaction.value),
    // nonce: await provider.getTransactionCount(transaction.from, "latest"),
    gasLimit: ethersUtils.hexlify(transaction.gasLimit),
    gasPrice: await provider.getGasPrice(),
  }
}
