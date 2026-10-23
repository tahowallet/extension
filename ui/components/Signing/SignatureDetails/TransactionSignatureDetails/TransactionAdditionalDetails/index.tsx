import React, { ReactElement } from "react"
import { TransactionSignatureSummaryProps } from "../TransactionSignatureSummary/TransactionSignatureSummaryProps"
import SwapAssetDetails from "./SwapAssetDetails"
import SimulatedBalanceChanges from "./SimulatedBalanceChanges"

export default function TransactionAdditionalDetails({
  transactionRequest,
  annotation,
}: TransactionSignatureSummaryProps): ReactElement | null {
  return (
    <>
      {annotation?.type === "asset-swap" && (
        <SwapAssetDetails
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )}
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotation}
      />
    </>
  )
}
