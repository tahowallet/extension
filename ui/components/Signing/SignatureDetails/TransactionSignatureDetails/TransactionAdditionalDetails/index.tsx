import React, { ReactElement } from "react"
import { TransactionSignatureSummaryProps } from "../TransactionSignatureSummary/TransactionSignatureSummaryProps"
import SwapAssetDetails from "./SwapAssetDetails"

export default function TransactionAdditionalDetails({
  transactionRequest,
  annotation,
}: TransactionSignatureSummaryProps): ReactElement {
  switch (annotation?.type) {
    case "asset-swap":
      return (
        <SwapAssetDetails
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      )
    default:
      return <></>
  }
}
