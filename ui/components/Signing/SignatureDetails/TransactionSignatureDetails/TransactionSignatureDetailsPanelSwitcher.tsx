import React, { ReactElement } from "react"
import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useSwitchablePanels } from "../../../../hooks"
import DetailsPanel from "./DetailsPanel"
import RawDataPanel from "./RawDataPanel"
import SimulationPanel from "./SimulationPanel"

export default function TransactionDataPanelSwitcher({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement {
  const panels = isEnabled(FeatureFlags.SUPPORT_SIMULATION_TAB)
    ? [
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
      ]
    : [
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
      ]

  const switchablePanels = useSwitchablePanels(panels)

  return <>{switchablePanels}</>
}
