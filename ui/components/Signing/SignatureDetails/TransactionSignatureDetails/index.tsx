import React, { ReactElement } from "react"
import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import TransactionSignatureDetailsPanelSwitcher from "./TransactionSignatureDetailsPanelSwitcher"
import TransactionSignatureSummary from "./TransactionSignatureSummary"

export type TransactionSignatureDetailsProps = {
  transactionRequest: EnrichedEVMTransactionRequest
}

export default function TransactionSignatureDetails({
  transactionRequest,
}: TransactionSignatureDetailsProps): ReactElement {
  const { annotation } = transactionRequest

  return (
    <>
      <div className="standard_width">
        <TransactionSignatureSummary
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      </div>
      <TransactionSignatureDetailsPanelSwitcher
        transactionRequest={transactionRequest}
      />
    </>
  )
}
