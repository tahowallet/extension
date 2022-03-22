import React, { ReactElement } from "react"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionLedgerActivateBlindSigning(): ReactElement {
  return (
    <SignTransactionSlideUpContentLayout
      title="Activate blind signing"
      helpMessage="Take the following steps:"
      steps={[
        <>Open Ethereum app on Ledger</>,
        <>Navigate to Settings</>,
        <>Enable blind signing</>,
      ]}
      onHelpClick={() =>
        window.open(
          "https://support.ledger.com/hc/en-us/articles/4405481324433-Enable-blind-signing-in-the-Ethereum-ETH-app?docs=true"
        )
      }
    />
  )
}
