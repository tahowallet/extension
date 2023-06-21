import { assetAmountToDesiredDecimals } from "../../assets"
import {
  convertToEth,
  isMaxUint256,
  normalizeEVMAddress,
  sameEVMAddress,
  weiToGwei,
} from "../../lib/utils"
import { isDefined } from "../../lib/utils/type-guards"
import { ConfirmedEVMTransaction, TxStatus } from "../../networks"
import { Transaction } from "../../services/chain/db"
import { EnrichedEVMTransaction } from "../../services/enrichment"
import { getRecipient, getSender } from "../../services/enrichment/utils"
import { HexString } from "../../types"

export const INFINITE_VALUE = "infinite"

export type Activity = {
  status?: number
  type?: string
  to?: string
  recipient: { address?: HexString; name?: string }
  sender: { address?: HexString; name?: string }
  from: string
  blockHeight: number | null
  value: string
  nonce: number
  hash: string
  blockHash: string | null
  blockTimestamp?: number
  assetSymbol: string
  assetLogoUrl?: string
}

export type AssetTransferDetail = {
  assetIconUrl?: string
  label: string
  value: string
}

export type ActivityDetail = {
  tx: Transaction | EnrichedEVMTransaction
  state: TransactionStatus
  timestamp?: string
  blockHeight?: string
  gas?: string
  nonce: string
  gasPrice?: string
  maxFeePerGas?: string
  amount: string
} & (
  | { state: "pending" | "dropped" }
  | ({ blockHeight: string; gas: string } & (
      | { state: "completed"; assetTransfers: AssetTransferDetail[] }
      | { state: "failed" }
    ))
)

const ACTIVITY_DECIMALS = 2

function isEnrichedTransaction(
  transaction: Transaction | EnrichedEVMTransaction
): transaction is EnrichedEVMTransaction {
  return "annotation" in transaction
}

function getAmount(tx: EnrichedEVMTransaction): string {
  const {
    value,
    network: {
      baseAsset: { symbol },
    },
  } = tx
  if (value == null || typeof value === "undefined") {
    return "(Unknown)"
  }

  return `${convertToEth(value) || "0"} ${symbol}`
}

type TransactionStatus = "pending" | "dropped" | "failed" | "completed"

export function getActivityStatus(
  tx:
    | Pick<Transaction, "blockHeight">
    | Pick<ConfirmedEVMTransaction, "blockHeight" | "status">
): TransactionStatus {
  const { blockHeight } = tx
  const status = "status" in tx ? tx.status : undefined
  if (
    blockHeight !== null &&
    status !== undefined &&
    status !== TxStatus.SUCCESS
  ) {
    return "failed"
  }

  if (blockHeight !== null) {
    return "completed"
  }

  if (blockHeight === null && status === TxStatus.FAIL) {
    return "dropped"
  }

  return "pending"
}

function getGweiPrice(value: bigint | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return undefined
  }
  return `${weiToGwei(value) || "0"} Gwei`
}

function getTimestamp(blockTimestamp: number | undefined) {
  return blockTimestamp
    ? new Date(blockTimestamp * 1000).toLocaleString()
    : undefined
}

const getAssetSymbol = (transaction: EnrichedEVMTransaction) => {
  const { annotation } = transaction

  switch (annotation?.type) {
    case "asset-transfer":
    case "asset-approval":
      return annotation.assetAmount.asset.symbol
    default:
      return transaction.asset.symbol
  }
}

const getValue = (transaction: Transaction | EnrichedEVMTransaction) => {
  const { asset, value } = transaction
  const localizedValue = assetAmountToDesiredDecimals(
    {
      asset,
      amount: value,
    },
    ACTIVITY_DECIMALS
  ).toLocaleString("default", {
    maximumFractionDigits: ACTIVITY_DECIMALS,
  })

  if (isEnrichedTransaction(transaction)) {
    const { annotation } = transaction
    switch (annotation?.type) {
      case "asset-transfer":
        return annotation.assetAmount.localizedDecimalAmount
      case "asset-approval":
        return isMaxUint256(annotation.assetAmount.amount)
          ? INFINITE_VALUE
          : annotation.assetAmount.localizedDecimalAmount
      default:
        return localizedValue
    }
  }

  return localizedValue
}

export const getActivity = (
  transaction: Transaction | EnrichedEVMTransaction
): Activity => {
  const { to, from, blockHeight, nonce, hash, blockHash, asset } = transaction

  let activity: Activity = {
    status: "status" in transaction ? transaction.status : undefined,
    to: to && normalizeEVMAddress(to),
    from: normalizeEVMAddress(from),
    recipient: { address: to },
    sender: { address: from },
    blockHeight,
    assetSymbol: asset.symbol,
    nonce,
    hash,
    blockHash,
    value: getValue(transaction),
  }

  if (isEnrichedTransaction(transaction)) {
    const { annotation } = transaction

    activity = {
      ...activity,
      type: annotation?.type,
      value: getValue(transaction),
      blockTimestamp: annotation?.blockTimestamp,
      assetLogoUrl: annotation?.transactionLogoURL,
      assetSymbol: getAssetSymbol(transaction),
      recipient: getRecipient(transaction),
      sender: getSender(transaction),
    }
  }

  return activity
}

export const sortActivities = (a: Activity, b: Activity): number => {
  if (
    a.blockHeight === null ||
    b.blockHeight === null ||
    a.blockHeight === b.blockHeight
  ) {
    // Sort dropped transactions after their corresponding successful ones.
    if (a.nonce === b.nonce) {
      if (a.blockHeight === null) {
        return 1
      }
      if (b.blockHeight === null) {
        return -1
      }
    }
    // Sort by nonce if a block height is missing or equal between two
    // transactions, as long as the two activities are on the same network;
    // otherwise, sort as before.
    return b.nonce - a.nonce
  }
  // null means pending or dropped, these are always sorted above everything
  // if networks don't match.
  if (a.blockHeight === null && b.blockHeight === null) {
    return 0
  }
  if (a.blockHeight === null) {
    return -1
  }
  if (b.blockHeight === null) {
    return 1
  }
  return b.blockHeight - a.blockHeight
}

export function getActivityDetails(tx: EnrichedEVMTransaction): ActivityDetail {
  const { annotation } = tx
  const assetTransfers =
    annotation?.subannotations === undefined
      ? []
      : annotation.subannotations
          .map((subannotation) => {
            if (
              subannotation.type === "asset-transfer" &&
              (sameEVMAddress(subannotation.sender.address, tx.from) ||
                sameEVMAddress(subannotation.recipient.address, tx.from))
            ) {
              return {
                direction: sameEVMAddress(subannotation.sender.address, tx.from)
                  ? "out"
                  : "in",
                assetSymbol: subannotation.assetAmount.asset.symbol,
                assetLogoUrl: subannotation.assetAmount.asset.metadata?.logoURL,
                localizedDecimalAmount:
                  subannotation.assetAmount.localizedDecimalAmount,
              }
            }
            return undefined
          })
          .filter(isDefined)

  const activity = {
    tx,
    nonce: tx.nonce.toString(),
    gasPrice: getGweiPrice(tx.gasPrice),
    maxFeePerGas: getGweiPrice(tx.maxFeePerGas),
    amount: getAmount(tx),
  }

  switch (getActivityStatus(tx)) {
    case "pending":
      return { ...activity, state: "pending" }
    case "completed":
      return {
        ...activity,
        state: "completed",
        // FIXME: There's no EnrichedConfirmedEVMTx type
        blockHeight: tx.blockHeight?.toString() || "",
        timestamp: getTimestamp(tx.annotation?.blockTimestamp),
        gas: "gasUsed" in tx ? tx.gasUsed.toString() : "",
        assetTransfers: assetTransfers.map((transfer) => {
          return {
            assetIconUrl: transfer.assetLogoUrl ?? "",
            label: transfer.assetSymbol,
            value:
              transfer.direction === "in"
                ? transfer.localizedDecimalAmount
                : `-${transfer.localizedDecimalAmount}`,
          }
        }),
      }
    case "failed":
      return {
        ...activity,
        state: "failed",
        blockHeight: tx.blockHeight?.toString() || "",
        timestamp: getTimestamp(tx.annotation?.blockTimestamp),
        gas: "gasUsed" in tx ? tx.gasUsed.toString() : "",
      }
    case "dropped":
      return { ...activity, state: "dropped" }
    default:
      throw new Error("Unknown transaction status")
  }
}
