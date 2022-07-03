import React, { ReactElement } from "react"
import { EnrichedEIP1559TransactionRequest } from "@tallyho/tally-background/services/enrichment"
import SigningDataTransactionPanelSwitcher from "./SigningDataTransactionPanelSwitcher"
import SigningDataTransactionPanelCombined from "./SigningDataTransactionPanelCombined"
import SigningDataTransactionSummary from "./SigningDataTransactionSummary"

export type SigningDataTransactionProps = {
  transactionRequest: EnrichedEIP1559TransactionRequest
}

export default function SigningDataTransaction({
  transactionRequest,
}: SigningDataTransactionProps): ReactElement {
  const { annotation } = transactionRequest
  const annotatedTransactionType = annotation?.type ?? "contract-interaction"

  return (
    <section>
      <SigningDataTransactionSummary
        transactionRequest={transactionRequest}
        annotation={annotation}
      />
      {annotatedTransactionType === "contract-interaction" ? (
        <SigningDataTransactionPanelCombined
          transactionRequest={transactionRequest}
        />
      ) : (
        <SigningDataTransactionPanelSwitcher
          transactionRequest={transactionRequest}
        />
      )}
    </section>
  )
}
