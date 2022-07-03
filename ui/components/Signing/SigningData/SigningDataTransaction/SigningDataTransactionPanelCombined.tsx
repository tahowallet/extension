import { EnrichedEIP1559TransactionRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import SigningDataTransactionDetailPanel from "./SigningDataTransactionDetailPanel"
import SigningDataTransactionRawDataPanel from "./SigningDataTransactionRawDataPanel"

export default function SigningDataTransactionPanelCombined({
  transactionRequest,
}: {
  transactionRequest: EnrichedEIP1559TransactionRequest
}): ReactElement {
  return (
    <>
      <SigningDataTransactionDetailPanel
        transactionRequest={transactionRequest}
      />
      <SigningDataTransactionRawDataPanel
        transactionRequest={transactionRequest}
      />
    </>
  )
}
