import {ReactElement, useCallback, useState} from "react"
import {useBackgroundDispatch} from "../../../hooks"
import SharedButton from "../../Shared/SharedButton"
import {useSigningLedgerState} from "../../SignTransaction/useSigningLedgerState"

function SignerLedgerSigning(props: { request: any, signActionCreator: any }) {
  return <></>
}

export function SignerLedgerFrame({
  children,
  request,
  signer,
  signingAction,
  signActionCreator,
  rejectActionCreator
}: SigningFrameProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const [isSigning, setIsSigning] = useState(false)
  const ledgerState = useSigningLedgerState(signer)

  const handleConfirm = useCallback(() => {
    setIsSigning(true)
  }, [setIsSigning])

  const handleReject = useCallback(() => {
    dispatch(rejectActionCreator())
  }, rejectActionCreator)

  // ...

  return isSigning ?
      <SignerLedgerSigning request={request} signActionCreator={signActionCreator} /> :
      <>
        <SignerLedgerConnectionStatus signer={signer} />
        {children}
        <footer>
          <SharedButton
            iconSize="large"
            size="large"
            type="secondary"
            onClick={handleReject}
          >
            Reject
          </SharedButton>

          {signingLedgerState !== "avaiable" ? (
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
                {signingAction}
              </SharedButton>
            )
        </footer>
        <SharedSlideUpMenu ...>
          <SignerLedgerConnect signer={signer} />
        <SharedSlideUpMenu>
      </>
}
