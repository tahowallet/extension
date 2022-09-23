import React, { ReactElement } from "react"
import SignTransactionDetailPanel from "./SignTransactionDetailPanel"
import SignTransactionRawDataPanel from "./SignTransactionRawDataPanel"

export default function SignTransactionPanelCombined(): ReactElement {
  return (
    <>
      <SignTransactionDetailPanel
        // Don't display for contract interactions
        defaultPanelState={{ dismissedWarnings: ["send-to-contract"] }}
      />
      <SignTransactionRawDataPanel />
    </>
  )
}
