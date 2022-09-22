import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SignTransactionDetailPanel, {
  PanelState as DetailsPanelState,
} from "./SignTransactionDetailPanel"
import SignTransactionRawDataPanel from "./SignTransactionRawDataPanel"

export default function SignTransactionPanelSwitcher(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const [panelNumber, setPanelNumber] = useState(0)

  const [detailsPanelState, setPanelState] = useState<DetailsPanelState>({
    dismissedWarnings: [],
  })

  return (
    <>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={[t("detailPanelName"), t("rawDataPanelName")]}
      />
      {panelNumber === 0 ? (
        <SignTransactionDetailPanel
          panelState={detailsPanelState}
          setPanelState={setPanelState}
        />
      ) : null}
      {panelNumber === 1 ? <SignTransactionRawDataPanel /> : null}
    </>
  )
}
