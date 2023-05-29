import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SignTransactionRawDataPanel from "./SignTransactionRawDataPanel"
import DetailPanel from "../Signing/SignatureDetails/TransactionSignatureDetails/DetailsPanel"

export default function SignTransactionPanelSwitcher(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={[t("detailPanelName"), t("rawDataPanelName")]}
      />
      {panelNumber === 0 ? <DetailPanel /> : null}
      {panelNumber === 1 ? <SignTransactionRawDataPanel /> : null}
    </>
  )
}
