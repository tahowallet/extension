/* eslint-disable import/prefer-default-export */
import { convertToEth, weiToGwei } from "../../lib/utils"
import { EnrichedEVMTransaction } from "../../services/enrichment"
import { ActivityDetails } from "../activitiesOnChain"

enum TxStatus {
  FAIL = 0,
  SUCCESS = 1,
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

function getBlockHeight(tx: EnrichedEVMTransaction): string {
  const { blockHeight } = tx
  const status = "status" in tx ? tx.status : undefined
  if (
    blockHeight !== null &&
    status !== undefined &&
    status !== TxStatus.SUCCESS
  ) {
    return "(failed)"
  }
  if (blockHeight !== null) {
    return blockHeight.toString()
  }
  if (blockHeight === null && status === TxStatus.FAIL) {
    return "(dropped)"
  }

  return "(pending)"
}

function getGweiPrice(value: bigint | null | undefined): string {
  if (value === null || typeof value === "undefined") {
    return "(Unknown)"
  }
  return `${weiToGwei(value) || "0"} Gwei`
}

export function getActivityDetails(
  tx: EnrichedEVMTransaction
): ActivityDetails {
  return [
    { label: "Block Height", value: getBlockHeight(tx) },
    { label: "Amount", value: getAmount(tx) },
    { label: "Max Fee/Gas", value: getGweiPrice(tx.maxFeePerGas) },
    { label: "Gas Price", value: getGweiPrice(tx.gasPrice) },
    { label: "Gas", value: "gasUsed" in tx ? tx.gasUsed.toString() : "" },
    { label: "Nonce", value: tx.nonce.toString() },
  ]
}
