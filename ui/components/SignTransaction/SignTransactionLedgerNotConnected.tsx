import React, { ReactElement } from "react"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionLedgerNotConnected(): ReactElement {
  return (
    <SignTransactionSlideUpContentLayout
      title="Connect to Ledger"
      helpMessage="Take the following steps:"
      steps={[
        <>Plug in Ledger</>,
        <>Enter PIN to unlock</>,
        <>Open Ethereum app</>,
      ]}
    />
  )
}
