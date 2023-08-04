import React, { ReactElement } from "react"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"
import TransferSummary from "./TransferSummary"
import SpendApprovalSummary from "./SpendApprovalSummary"
import SwapAssetSummary from "./SwapAssetSummary"
import TransactionSignatureSummaryDefault from "./TransactionSignatureSummaryDefault"
import ContractInteractionSummary from "./ContractInteractionSummary"

/**
 * Creates transaction type-specific summary blocks for use in parent
 * components. Uses enriched transaction annotations for most rich summary
 * blocks.
 */
export default function TransactionSignatureSummary({
  transactionRequest,
  annotation,
}: TransactionSignatureSummaryProps): ReactElement {
  switch (annotation?.type) {
    case "asset-swap":
      return (
        <SwapAssetSummary
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )
    case "asset-approval":
      return (
        <SpendApprovalSummary
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )
    case "asset-transfer":
      return (
        <TransferSummary
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )
    case "contract-interaction":
      return transactionRequest.value === BigInt(0) ? (
        <ContractInteractionSummary
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      ) : (
        <TransactionSignatureSummaryDefault
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )
    default:
      return (
        <TransactionSignatureSummaryDefault
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )
  }
}
