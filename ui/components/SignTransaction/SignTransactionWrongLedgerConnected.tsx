import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionWrongLedgerConnected({
  signerAccountTotal,
}: {
  signerAccountTotal?: AccountTotal
}): ReactElement {
  const address = signerAccountTotal?.address ?? ""

  return (
    <SignTransactionSlideUpContentLayout
      title="Wrong Ledger"
      helpMessage="Looks like you are using the wrong Ledger."
      steps={[
        <div className="step_account">
          <div className="step_account_content">
            <div>Connect the Ledger containing this account:</div>
            <div>
              <SharedButton
                iconSmall="new-tab"
                size="small"
                type="deemphasizedWhite"
                onClick={() => {
                  window
                    .open(`https://etherscan.io/address/${address}`, "_blank")
                    ?.focus()
                }}
              >
                {`${address.slice(0, 7)}...${address.slice(-6)}`}
              </SharedButton>
            </div>
          </div>

          <style jsx>{`
            .step_account {
              align-self: flex-start;
            }

            .step_account_content {
              display: flex;
              flex-flow: column;
              gap: 0.5rem;
            }
          `}</style>
        </div>,
        <>Refresh the page</>,
      ]}
    />
  )
}
