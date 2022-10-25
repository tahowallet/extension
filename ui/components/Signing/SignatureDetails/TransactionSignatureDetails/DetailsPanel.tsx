import React, { ReactElement } from "react"
import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import SignTransactionDetailPanel from "../../../SignTransaction/SignTransactionDetailPanel"

export default function DetailPanel({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement {
  return <SignTransactionDetailPanel transactionRequest={transactionRequest} />
}
