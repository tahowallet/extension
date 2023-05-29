import React, { ReactElement } from "react"
import DetailPanel from "../Signing/SignatureDetails/TransactionSignatureDetails/DetailsPanel"
import SignTransactionRawDataPanel from "./SignTransactionRawDataPanel"

export default function SignTransactionPanelCombined(): ReactElement {
  return (
    <>
      <DetailPanel
        // Don't display for contract interactions
        defaultPanelState={{ dismissedWarnings: ["send-to-contract"] }}
      />
      <SignTransactionRawDataPanel />
    </>
  )
}
