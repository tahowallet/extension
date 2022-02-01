import React, { ReactElement } from "react"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionLedgerNotConnected(): ReactElement {
  return (
    <SignTransactionSlideUpContentLayout
      title="Connect to Ledger"
      helpMessage="Take the following steps:"
      steps={
        <>
          <li>Plug in Ledger</li>
          <li>Enter PIN to unlock</li>
          <li>Open Ethereum app</li>
        </>
      }
    />
  )
}
