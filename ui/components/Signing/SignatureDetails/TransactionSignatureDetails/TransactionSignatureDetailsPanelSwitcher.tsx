import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useSwitchablePanels } from "../../../../hooks"
import DetailsPanel from "./DetailsPanel"
import RawDataPanel from "./RawDataPanel"

export default function TransactionDataPanelSwitcher({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement | null {
  const switchablePanels = useSwitchablePanels([
    {
      name: "Details",
      panelElement: () => (
        <DetailsPanel transactionRequest={transactionRequest} />
      ),
    },
    {
      name: "Raw data",
      panelElement: () => (
        <RawDataPanel transactionRequest={transactionRequest} />
      ),
    },
  ])

  return switchablePanels
}
