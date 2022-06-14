import { weiToGwei } from "../lib/utils"
import { EnrichedEIP1559TransactionRequest } from "../services/enrichment"

export default function getMinMainAssetAmountForTransaction(
  transactionRequest: EnrichedEIP1559TransactionRequest
): bigint {
  const { gasLimit, maxFeePerGas, maxPriorityFeePerGas, annotation, network } =
    transactionRequest
  const mainAssetSymbol = network.baseAsset.symbol
  const gasFee = BigInt(
    weiToGwei(gasLimit * (maxFeePerGas + maxPriorityFeePerGas)).split(".")[0]
  )

  if (!annotation) return gasFee

  const { type: transactionType } = annotation

  if (
    transactionType === "asset-transfer" ||
    transactionType === "asset-approval"
  ) {
    return annotation.assetAmount.asset.symbol === mainAssetSymbol
      ? annotation.assetAmount.amount + gasFee
      : gasFee
  }

  if (transactionType === "asset-swap") {
    return annotation.fromAssetAmount.asset.symbol === mainAssetSymbol
      ? annotation.fromAssetAmount.amount + gasFee
      : gasFee
  }

  return gasFee
}
