import React, { ReactElement } from "react"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionLedgerBusy(): ReactElement {
  return (
    <SignTransactionSlideUpContentLayout
      title="Ledger is busy"
      helpMessage="Looks like your Ledger has another signature in progress."
      steps={[<>Accept or Reject transaction on device</>, <>Refresh page</>]}
    />
  )
}
