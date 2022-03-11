import React, { ReactElement, useState } from "react"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SignTransactionDetailPanel from "./SignTransactionDetailPanel"

export default function SignTransactionPanelSwitcher(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Details"]}
      />
      {panelNumber === 0 ? <SignTransactionDetailPanel /> : null}
    </>
  )
}
