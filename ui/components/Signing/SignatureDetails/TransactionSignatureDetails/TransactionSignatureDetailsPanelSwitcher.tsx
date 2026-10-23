import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useSwitchablePanels } from "../../../../hooks"
import DetailsPanel from "./DetailsPanel"
import RawDataPanel from "./RawDataPanel"
import SimulationPanel from "./SimulationPanel"

export default function TransactionDataPanelSwitcher({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement | null {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })

  const switchablePanels = useSwitchablePanels([
    {
      name: t("detailPanelName"),
      panelElement: () => (
        <DetailsPanel transactionRequest={transactionRequest} />
      ),
    },
    {
      name: t("simulationPanelName"),
      panelElement: () => (
        <SimulationPanel transactionRequest={transactionRequest} />
      ),
    },
    {
      name: t("rawDataPanelName"),
      panelElement: () => (
        <RawDataPanel transactionRequest={transactionRequest} />
      ),
    },
  ])

  return switchablePanels
}
