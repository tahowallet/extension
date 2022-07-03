import { EnrichedEIP1559TransactionRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useSwitchablePanels } from "../../../../hooks"
import SigningDataTransactionDetailPanel from "./SigningDataTransactionDetailPanel"
import SigningDataTransactionRawDataPanel from "./SigningDataTransactionRawDataPanel"

export default function SigningDataTransactionPanelSwitcher({
  transactionRequest,
}: {
  transactionRequest: EnrichedEIP1559TransactionRequest
}): ReactElement {
  const switchablePanels = useSwitchablePanels([
    {
      name: "Details",
      panelElement: (
        <SigningDataTransactionDetailPanel
          transactionRequest={transactionRequest}
        />
      ),
    },
    {
      name: "Raw data",
      panelElement: (
        <SigningDataTransactionRawDataPanel
          transactionRequest={transactionRequest}
        />
      ),
    },
  ])

  return <>{switchablePanels}</>
}
