import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useCallback, useState } from "react"
import { useBackgroundDispatch } from "../../../../hooks"
import { SignerFrameProps } from ".."
import SharedButton from "../../../Shared/SharedButton"
import SharedSlideUpMenu from "../../../Shared/SharedSlideUpMenu"
import SignerLedgerConnect from "./SignerLedgerConnect"
import SignerLedgerSigning from "./SignerLedgerSigning"
import SignerLedgerConnectionStatus from "./SignerLedgerConnectionStatus"
import { useSigningLedgerState } from "../../../SignTransaction/useSigningLedgerState"

export default function SignerLedgerFrame<T extends SignOperationType>({
  children,
  request,
  signer,
  signingAddress,
  signingActionLabel,
  signActionCreator,
  rejectActionCreator,
}: SignerFrameProps<T>): ReactElement {
  const [isSigning, setIsSigning] = useState(false)
  const dispatch = useBackgroundDispatch()

  const handleConfirm = useCallback(() => {
    dispatch(signActionCreator())
    setIsSigning(true)
  }, [dispatch, signActionCreator])

  const handleReject = useCallback(() => {
    dispatch(rejectActionCreator())
  }, [dispatch, rejectActionCreator])

  const [isSlideUpOpen, setIsSlideUpOpen] = useState(false)
  const ledgerState = useSigningLedgerState(signingAddress.address, signer)
  const isArbitraryDataSigningRequired =
    ("input" in request &&
      request.input !== null &&
      request.input.length > 0) ||
    ("signingData" in request &&
      (typeof request.signingData !== "string" ||
        request.signingData.length > 0))

  // FIXME Once the legacy signing flow is removed, `useSigningLedgerState` can
  // FIXME be updated to not accept undefined or null and therefore to not
  // FIXME return null, at which point ledgerState will be known non-null here.
  if (ledgerState === null) {
    throw new Error(
      `Could not look up Ledger state for signer: ${JSON.stringify(signer)}`
    )
  }

  const mustEnableArbitraryDataSigning =
    ledgerState.state === "available" &&
    isArbitraryDataSigningRequired &&
    !ledgerState.arbitraryDataEnabled

  const ledgerCannotSign =
    ledgerState.state !== "available" || mustEnableArbitraryDataSigning

  return (
    <>
      <SignerLedgerConnectionStatus
        ledgerState={ledgerState}
        mustEnableArbitraryDataSigning={mustEnableArbitraryDataSigning}
      />
      {isSigning && ledgerState.state === "available" ? (
        <>
          <SignerLedgerSigning
            request={request}
            isArbitraryDataSigningRequired={isArbitraryDataSigningRequired}
            displayDetails={ledgerState.displayDetails}
          />
        </>
      ) : (
        <>
          {children}
          <footer>
            <SharedButton size="large" type="secondary" onClick={handleReject}>
              Reject
            </SharedButton>

            {ledgerCannotSign ? (
              <SharedButton
                type="primary"
                size="large"
                onClick={() => {
                  setIsSlideUpOpen(true)
                }}
              >
                Check Ledger
              </SharedButton>
            ) : (
              <SharedButton
                type="primary"
                size="large"
                onClick={handleConfirm}
                showLoadingOnClick
              >
                {signingActionLabel}
              </SharedButton>
            )}
          </footer>
          <SharedSlideUpMenu
            isOpen={isSlideUpOpen}
            close={() => setIsSlideUpOpen(false)}
          >
            <SignerLedgerConnect signingLedgerState={ledgerState} />
          </SharedSlideUpMenu>
        </>
      )}
    </>
  )
}
