import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useSwitchablePanels } from "../../../../hooks"
import DetailsPanel from "./DetailsPanel"
import RawDataPanel from "./RawDataPanel"
import SimulationPanel from "./SimulationPanel"

export default function TransactionDataPanelSwitcher({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement {
  const switchablePanels = useSwitchablePanels([
    {
      name: "Details",
      panelElement: () => (
        <DetailsPanel transactionRequest={transactionRequest} />
      ),
    },
    {
      name: "Simulation",
      panelElement: () => (
        <SimulationPanel transactionRequest={transactionRequest} />
      ),
    },
    {
      name: "Raw data",
      panelElement: () => (
        <RawDataPanel transactionRequest={transactionRequest} />
      ),
    },
  ])

  return <>{switchablePanels}</>
}
