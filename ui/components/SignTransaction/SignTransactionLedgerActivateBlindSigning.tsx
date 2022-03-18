import React, { ReactElement } from "react"
import { connectLedger } from "@tallyho/tally-background/redux-slices/ledger"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"
import { useBackgroundDispatch } from "../../hooks"

export default function SignTransactionLedgerActivateBlindSigning(): ReactElement {
  const dispatch = useBackgroundDispatch()
  return (
    <SignTransactionSlideUpContentLayout
      title="Activate blind signing"
      helpMessage="Take the following steps:"
      steps={[
        <>Open Ethereum app on Ledger</>,
        <>Navigate to Settings</>,
        <>Enable blind signing</>,
      ]}
      onRefreshClick={() => {
        dispatch(connectLedger())
      }}
      onHelpClick={() =>
        window.open(
          "https://support.ledger.com/hc/en-us/articles/4405481324433-Enable-blind-signing-in-the-Ethereum-ETH-app?docs=true"
        )
      }
    />
  )
}
