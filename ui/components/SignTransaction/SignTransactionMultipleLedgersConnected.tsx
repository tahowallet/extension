import React, { ReactElement } from "react"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionMultipleLedgersConnected(): ReactElement {
  return (
    <SignTransactionSlideUpContentLayout
      title="Multiple Ledgers are connected"
      helpMessage="Take the following steps:"
      steps={[
        <>Remove all Ledgers but one</>,
        <>Enter PIN to unlock</>,
        <>Open Ethereum app</>,
      ]}
    />
  )
}
