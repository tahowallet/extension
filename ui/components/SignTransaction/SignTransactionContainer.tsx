import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, ReactNode, useState } from "react"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SignTransactionDetailPanel from "./SignTransactionDetailPanel"
import SignTransactionLedgerActivateBlindSigning from "./SignTransactionLedgerActivateBlindSigning"
import SignTransactionLedgerBusy from "./SignTransactionLedgerBusy"
import SignTransactionLedgerNotConnected from "./SignTransactionLedgerNotConnected"
import SignTransactionMultipleLedgersConnected from "./SignTransactionMultipleLedgersConnected"
import SignTransactionNetworkAccountInfoTopBar from "./SignTransactionNetworkAccountInfoTopBar"
import SignTransactionWrongLedgerConnected from "./SignTransactionWrongLedgerConnected"
import { useSigningLedgerState } from "./useSigningLedgerState"

export default function SignTransactionContainer({
  signerAccountTotal,
  title,
  detailPanel,
  reviewPanel,
  extraPanel,
  confirmButtonLabel,
  handleConfirm,
  handleReject,
  isTransactionSigning,
}: {
  signerAccountTotal: AccountTotal
  title: ReactNode
  detailPanel: ReactNode
  reviewPanel: ReactNode
  extraPanel: ReactNode
  confirmButtonLabel: ReactNode
  handleConfirm: () => void
  handleReject: () => void
  isTransactionSigning: boolean
}): ReactElement {
  const { signingMethod } = signerAccountTotal
  const [isSlideUpOpen, setSlideUpOpen] = useState(false)

  const signingLedgerState = useSigningLedgerState(signingMethod ?? null)

  const isLedgerSigning = signingMethod?.type === "ledger"
  const isWaitingForHardware = isLedgerSigning && isTransactionSigning

  return (
    <section>
      <SignTransactionNetworkAccountInfoTopBar
        accountTotal={signerAccountTotal}
      />
      <h1 className="serif_header title">
        {isWaitingForHardware ? "Awaiting hardware wallet signature" : title}
      </h1>
      <div className="primary_info_card standard_width">
        {isWaitingForHardware ? reviewPanel : detailPanel}
      </div>
      {isWaitingForHardware ? (
        <div className="cannot_reject_warning">
          <span className="block_icon" />
          Tx can only be Rejected from Ledger
        </div>
      ) : (
        <>
          {extraPanel}
          <div className="footer_actions">
            <SharedButton
              iconSize="large"
              size="large"
              type="secondary"
              onClick={handleReject}
            >
              Reject
            </SharedButton>
            {/* TODO: split into different components depending on signing method, to avoid convoluted logic below */}
            {signerAccountTotal.signingMethod &&
              (signerAccountTotal.signingMethod.type === "ledger" &&
              signingLedgerState !== "available" ? (
                <SharedButton
                  type="primary"
                  iconSize="large"
                  size="large"
                  onClick={() => {
                    setSlideUpOpen(true)
                  }}
                >
                  Check Ledger
                </SharedButton>
              ) : (
                <SharedButton
                  type="primary"
                  iconSize="large"
                  size="large"
                  onClick={handleConfirm}
                  showLoadingOnClick
                >
                  {confirmButtonLabel}
                </SharedButton>
              ))}
            {!signerAccountTotal.signingMethod && (
              <span className="no-signing">Read-only accounts cannot sign</span>
            )}
          </div>
        </>
      )}
      <SharedSlideUpMenu
        isOpen={isSlideUpOpen && signingLedgerState !== "available"}
        close={() => {
          setSlideUpOpen(false)
        }}
        alwaysRenderChildren
        size="auto"
      >
        {signingLedgerState === "no-ledger-connected" && (
          <SignTransactionLedgerNotConnected />
        )}
        {signingLedgerState === "wrong-ledger-connected" && (
          <SignTransactionWrongLedgerConnected
            signerAccountTotal={signerAccountTotal}
          />
        )}
        {signingLedgerState === "multiple-ledgers-connected" && (
          <SignTransactionMultipleLedgersConnected />
        )}
        {signingLedgerState === "activate-blind-signing" && (
          <SignTransactionLedgerActivateBlindSigning />
        )}
        {signingLedgerState === "busy" && <SignTransactionLedgerBusy />}
      </SharedSlideUpMenu>
      <style jsx>
        {`
          section {
            width: 100%;
            height: calc(100% - 80px);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: var(--green-95);
            z-index: 5;
          }
          .title {
            color: var(--trophy-gold);
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            text-align: center;
          }
          .primary_info_card {
            display: block;
            height: fit-content;
            border-radius: 16px;
            background-color: var(--hunter-green);
            margin: 16px 0px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer_actions {
            position: fixed;
            bottom: 0px;
            display: flex;
            width: 100%;
            padding: 0px 16px;
            box-sizing: border-box;
            align-items: center;
            height: 80px;
            justify-content: space-between;
            box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
            background-color: var(--green-95);
          }
          .cannot_reject_warning {
            position: fixed;
            display: flex;
            align-items: center;
            justify-content: center;
            bottom: 0;
            padding: 16px;
            color: var(--error);
            font-weight: 600;
            font-size: 18px;
          }
          .block_icon {
            width: 24px;
            height: 24px;
            margin: 8px;
            background: no-repeat center / cover
              url("./images/block_icon@2x.png");
          }
        `}
      </style>
    </section>
  )
}
