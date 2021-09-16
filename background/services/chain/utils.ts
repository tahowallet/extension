import { BigNumber } from "ethers"
import { Block as EthersBlock } from "@ethersproject/abstract-provider"
import { Transaction as EthersTransaction } from "@ethersproject/transactions"

import {
  AnyEVMTransaction,
  EIP1559Block,
  FungibleAsset,
  EVMNetwork,
  SignedEVMTransaction,
} from "../../types"
import { ETHEREUM } from "../../constants"

/*
 * Parse a block as returned by a polling provider.
 */
export function blockFromEthersBlock(gethResult: EthersBlock): EIP1559Block {
  return {
    hash: gethResult.hash as string,
    blockHeight: gethResult.number,
    parentHash: gethResult.parentHash as string,
    difficulty: BigInt(gethResult.difficulty),
    timestamp: gethResult.timestamp,
    baseFeePerGas: gethResult.baseFeePerGas.toBigInt(),
    network: ETHEREUM,
  }
}

/*
 * Parse a block as returned by a websocket provider subscription.
 */
export function blockFromWebsocketBlock(gethResult: any): EIP1559Block {
  return {
    hash: gethResult.hash as string,
    blockHeight: BigNumber.from(gethResult.number as string).toNumber(),
    parentHash: gethResult.parentHash as string,
    difficulty: BigInt(gethResult.difficulty as string),
    timestamp: BigNumber.from(gethResult.timestamp as string).toNumber(),
    baseFeePerGas: BigInt(gethResult.baseFeePerGas as string),
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
  tx: any,
  asset: FungibleAsset,
  network: EVMNetwork
): AnyEVMTransaction {
  return {
    hash: tx.hash as string,
    to: tx.to as string,
    from: tx.from as string,
    gas: BigInt(tx.gas as string),
    gasPrice: BigInt(tx.gasPrice as string),
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? BigInt(tx.maxPriorityFeePerGas)
      : null,
    input: tx.input as string,
    r: (tx.r as string) || undefined,
    s: (tx.s as string) || undefined,
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
  const newTx = {
    hash: tx.hash as string,
    from: tx.from as string,
    to: tx.to as string,
    nonce: BigInt(parseInt(tx.nonce.toString(), 10)),
    gas: tx.gasLimit.toBigInt(),
    gasPrice: tx.gasPrice ? tx.gasPrice.toBigInt() : null,
    maxFeePerGas: tx.maxFeePerGas ? tx.maxFeePerGas.toBigInt() : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas
      ? tx.maxPriorityFeePerGas.toBigInt()
      : null,
    value: tx.value.toBigInt(),
    input: tx.data,
    type: tx.type as AnyEVMTransaction["type"],
    blockHash: tx.blockHash || null,
    blockHeight: tx.blockNumber || null,
    network,
    asset,
  }
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
