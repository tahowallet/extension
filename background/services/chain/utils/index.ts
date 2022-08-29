import { BigNumber } from "ethers"
import {
  Block as EthersBlock,
  TransactionReceipt as EthersTransactionReceipt,
  TransactionRequest as EthersTransactionRequest,
} from "@ethersproject/abstract-provider"
import {
  Transaction as EthersTransaction,
  UnsignedTransaction,
} from "@ethersproject/transactions"

import {
  AnyEVMTransaction,
  EVMNetwork,
  AnyEVMBlock,
  EIP1559TransactionRequest,
  ConfirmedEVMTransaction,
  LegacyEVMTransactionRequest,
  isEIP1559TransactionRequest,
  TransactionRequest,
  isEIP1559SignedTransaction,
  SignedTransaction,
} from "../../../networks"
import { USE_MAINNET_FORK } from "../../../features"
import { FORK } from "../../../constants"
import type { PartialTransactionRequestWithFrom } from "../../enrichment"

/**
 * Parse a block as returned by a polling provider.
 */
export function blockFromEthersBlock(
  network: EVMNetwork,
  gethResult: EthersBlock
): AnyEVMBlock {
  return {
    hash: gethResult.hash,
    blockHeight: gethResult.number,
    parentHash: gethResult.parentHash,
    // FIXME Hold for ethers/v5.4.8 _difficulty BigNumber field; the current
    // FIXME difficutly field is a `number` and has overflowed since Ethereum
    // FIXME difficulty has exceeded MAX_SAFE_INTEGER. The current ethers
    // FIXME version devolves to `null` in that scenario, and does not reflect
    // FIXME in its type. The upcoming release will have a BigNumber
    // FIXME _difficulty field.
    difficulty: 0n,
    timestamp: gethResult.timestamp,
    baseFeePerGas: gethResult.baseFeePerGas?.toBigInt(),
    network,
  }
}

/**
 * Parse a block as returned by a websocket provider subscription.
 */
export function blockFromWebsocketBlock(
  network: EVMNetwork,
  incomingGethResult: unknown
): AnyEVMBlock {
  const gethResult = incomingGethResult as {
    hash: string
    number: string
    parentHash: string
    difficulty: string
    timestamp: string
    baseFeePerGas?: string
  }

  return {
    hash: gethResult.hash,
    blockHeight: BigNumber.from(gethResult.number).toNumber(),
    parentHash: gethResult.parentHash,
    difficulty: BigInt(gethResult.difficulty),
    timestamp: BigNumber.from(gethResult.timestamp).toNumber(),
    baseFeePerGas: gethResult.baseFeePerGas
      ? BigInt(gethResult.baseFeePerGas)
      : undefined,
    network,
  }
}

export function ethersTransactionRequestFromEIP1559TransactionRequest(
  transaction: EIP1559TransactionRequest
): EthersTransactionRequest {
  return {
    to: transaction.to,
    data: transaction.input ?? undefined,
    from: transaction.from,
    type: transaction.type,
    nonce: transaction.nonce,
    value: transaction.value,
    chainId: parseInt(transaction.chainID, 10),
    gasLimit: transaction.gasLimit,
    maxFeePerGas: transaction.maxFeePerGas,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
  }
}

export function ethersTransactionRequestFromLegacyTransactionRequest(
  transaction: LegacyEVMTransactionRequest
): EthersTransactionRequest {
  const { to, input, type, nonce, gasPrice, value, chainID, gasLimit } =
    transaction

  return {
    to,
    data: input ?? undefined,
    type: type ?? undefined,
    nonce,
    gasPrice,
    value,
    chainId: parseInt(chainID, 10),
    gasLimit,
  }
}

export function ethersTransactionFromTransactionRequest(
  transactionRequest: TransactionRequest
): EthersTransactionRequest {
  if (isEIP1559TransactionRequest(transactionRequest)) {
    return ethersTransactionRequestFromEIP1559TransactionRequest(
      transactionRequest
    )
  }
  // Legacy Transaction
  return ethersTransactionRequestFromLegacyTransactionRequest(
    transactionRequest
  )
}

function eip1559TransactionRequestFromEthersTransactionRequest(
  transaction: EthersTransactionRequest
): Partial<EIP1559TransactionRequest> {
  return {
    to: transaction.to,
    input: transaction.data?.toString() ?? null,
    from: transaction.from,
    type: transaction.type as 1 | 2,
    nonce:
      typeof transaction.nonce !== "undefined"
        ? parseInt(transaction.nonce.toString(), 16)
        : undefined,
    value:
      typeof transaction.value !== "undefined"
        ? BigInt(transaction.value.toString())
        : undefined,
    chainID: transaction.chainId?.toString(16),
    gasLimit:
      typeof transaction.gasLimit !== "undefined"
        ? BigInt(transaction.gasLimit.toString())
        : undefined,
    maxFeePerGas:
      typeof transaction.maxFeePerGas !== "undefined"
        ? BigInt(transaction.maxFeePerGas.toString())
        : undefined,
    maxPriorityFeePerGas:
      typeof transaction.maxPriorityFeePerGas !== "undefined"
        ? BigInt(transaction.maxPriorityFeePerGas.toString())
        : undefined,
  }
}

function legacyEVMTransactionRequestFromEthersTransactionRequest(
  transaction: EthersTransactionRequest
): Partial<LegacyEVMTransactionRequest> {
  return {
    to: transaction.to,
    input: transaction.data?.toString() ?? null,
    from: transaction.from,
    type: transaction.type as 0,
    nonce:
      typeof transaction.nonce !== "undefined"
        ? parseInt(transaction.nonce.toString(), 16)
        : undefined,
    value:
      typeof transaction.value !== "undefined"
        ? BigInt(transaction.value.toString())
        : undefined,
    chainID: transaction.chainId?.toString(16),
    gasLimit:
      typeof transaction.gasLimit !== "undefined"
        ? BigInt(transaction.gasLimit.toString())
        : undefined,
    gasPrice:
      typeof transaction.gasPrice !== "undefined"
        ? BigInt(transaction.gasPrice.toString())
        : undefined,
  }
}

export function transactionRequestFromEthersTransactionRequest(
  ethersTransactionRequest: EthersTransactionRequest
): Partial<TransactionRequest> {
  if (isEIP1559TransactionRequest(ethersTransactionRequest)) {
    return eip1559TransactionRequestFromEthersTransactionRequest(
      ethersTransactionRequest
    )
  }
  return legacyEVMTransactionRequestFromEthersTransactionRequest(
    ethersTransactionRequest
  )
}

export function unsignedTransactionFromEVMTransaction(
  tx: AnyEVMTransaction | PartialTransactionRequestWithFrom
): UnsignedTransaction {
  const unsignedTransaction: UnsignedTransaction = {
    to: tx.to,
    nonce: tx.nonce,
    gasLimit: BigNumber.from(tx.gasLimit),
    data: tx.input || "",
    value: BigNumber.from(tx.value),
    chainId: parseInt(USE_MAINNET_FORK ? FORK.chainID : tx.network.chainID, 10),
    type: tx.type,
  }

  if (isEIP1559TransactionRequest(tx)) {
    unsignedTransaction.maxFeePerGas = BigNumber.from(tx.maxFeePerGas)
    unsignedTransaction.maxPriorityFeePerGas = BigNumber.from(
      tx.maxPriorityFeePerGas
    )
  } else if ("gasPrice" in tx) {
    unsignedTransaction.gasPrice = BigNumber.from(tx?.gasPrice ?? 0)
  }
  return unsignedTransaction
}

export function ethersTransactionFromSignedTransaction(
  tx: SignedTransaction
): EthersTransaction {
  const baseTx: EthersTransaction = {
    nonce: Number(tx.nonce),
    to: tx.to,
    data: tx.input || "",
    gasPrice: BigNumber.from(tx.gasPrice),
    type: tx.type,
    chainId: parseInt(USE_MAINNET_FORK ? FORK.chainID : tx.network.chainID, 10),
    value: BigNumber.from(tx.value),
    gasLimit: BigNumber.from(tx.gasLimit),
  }

  if (isEIP1559SignedTransaction(tx)) {
    return {
      ...baseTx,
      maxFeePerGas: BigNumber.from(tx.maxFeePerGas),
      maxPriorityFeePerGas: BigNumber.from(tx.maxPriorityFeePerGas),
      r: tx.r,
      from: tx.from,
      s: tx.s,
      v: tx.v,
    }
  }

  return baseTx
}

/**
 * Parse a transaction as returned by a websocket provider subscription.
 */
export function enrichTransactionWithReceipt(
  transaction: AnyEVMTransaction,
  receipt: EthersTransactionReceipt
): ConfirmedEVMTransaction {
  const gasUsed = receipt.gasUsed.toBigInt()

  return {
    ...transaction,
    gasUsed,
    /* Despite the [ethers js docs](https://docs.ethers.io/v5/api/providers/types/) stating that
     * receipt.effectiveGasPrice "will simply be equal to the transaction gasPrice" on chains
     * that do not support EIP-1559 - it seems that this is not yet the case with Optimism.
     *
     * The `?? transaction.gasPrice` code fixes a bug where transaction enrichment was fails
     *  due to effectiveGasPrice being undefined and calling .toBigInt on it.
     *
     * This is not a perfect solution because transaction.gasPrice does not necessarily take
     * into account L1 rollup fees.
     */
    gasPrice: receipt.effectiveGasPrice?.toBigInt() ?? transaction.gasPrice,
    logs: receipt.logs.map(({ address, data, topics }) => ({
      contractAddress: address,
      data,
      topics,
    })),
    status:
      receipt.status ??
      // Pre-Byzantium transactions require a guesswork approach or an
      // eth_call; we go for guesswork.
      (gasUsed === transaction.gasLimit ? 0 : 1),
    blockHash: receipt.blockHash,
    blockHeight: receipt.blockNumber,
  }
}

/**
 * Parse a transaction as returned by a polling provider.
 */
export function transactionFromEthersTransaction(
  tx: EthersTransaction & {
    from: string
    blockHash?: string
    blockNumber?: number
    type?: number | null
  },
  network: EVMNetwork
): AnyEVMTransaction {
  if (tx.hash === undefined) {
    throw new Error("Malformed transaction")
  }
  if (tx.type !== 0 && tx.type !== 1 && tx.type !== 2) {
    throw new Error(`Unknown transaction type ${tx.type}`)
  }

  const newTx = {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    nonce: parseInt(tx.nonce.toString(), 10),
    gasLimit: tx.gasLimit.toBigInt(),
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
    asset: network.baseAsset,
  } as const // narrow types for compatiblity with our internal ones

  if (tx.r && tx.s && tx.v) {
    const signedTx: SignedTransaction = {
      ...newTx,
      r: tx.r,
      s: tx.s,
      v: tx.v,
    }
    return signedTx
  }
  return newTx
}
