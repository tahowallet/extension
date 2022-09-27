import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import DetailsPanel from "./DetailsPanel"
import RawDataPanel from "./RawDataPanel"

export default function TransactionSignatureDetailsPanelCombined({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement {
  return (
    <>
      <DetailsPanel transactionRequest={transactionRequest} />
      <RawDataPanel transactionRequest={transactionRequest} />
    </>
  )
}
