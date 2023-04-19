import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useCallback, useContext, useState } from "react"
import { useTranslation } from "react-i18next"
import { selectHasInsufficientFunds } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import { SignerFrameProps } from ".."
import SharedButton from "../../../Shared/SharedButton"
import SharedSlideUpMenu from "../../../Shared/SharedSlideUpMenu"
import SignerLedgerConnect from "./SignerLedgerConnect"
import SignerLedgerSigning from "./SignerLedgerSigning"
import SignerLedgerConnectionStatus from "./SignerLedgerConnectionStatus"
import { useSigningLedgerState } from "../../../SignTransaction/useSigningLedgerState"
import TransactionButton from "../TransactionButton"
import { SignerFrameContext } from "../../../../utils/signing"

export default function SignerLedgerFrame<T extends SignOperationType>({
  children,
  request,
  signer,
  signingAddress,
  signingActionLabelI18nKey,
  signActionCreator,
  rejectActionCreator,
}: SignerFrameProps<T>): ReactElement {
  const { t: globalT } = useTranslation()
  const { t } = useTranslation("translation", { keyPrefix: "ledger" })
  const { t: tSigning } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })

  const [isSigning, setIsSigning] = useState(false)
  const dispatch = useBackgroundDispatch()
  const signerFrameContext = useContext(SignerFrameContext)

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

  const hasInsufficientFunds = useBackgroundSelector(selectHasInsufficientFunds)

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

          <footer className="cannot_reject_warning">
            <span className="block_icon" />
            {t("onlyRejectFromLedger")}
          </footer>
          <style jsx>{`
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
          `}</style>
        </>
      ) : (
        <>
          <div className="signature-details">{children}</div>
          <footer>
            <TransactionButton
              size="large"
              type="secondary"
              onClick={handleReject}
            >
              {tSigning("reject")}
            </TransactionButton>

            {ledgerCannotSign ? (
              <SharedButton
                type="primary"
                size="large"
                onClick={() => {
                  setIsSlideUpOpen(true)
                }}
              >
                {t("checkLedger")}
              </SharedButton>
            ) : (
              <TransactionButton
                type="primary"
                size="large"
                onClick={handleConfirm}
                isDisabled={
                  hasInsufficientFunds ||
                  (signerFrameContext?.shouldBlockedSigning ?? false)
                }
                showLoadingOnClick
                showLoading
                reactOnWindowFocus
              >
                {globalT(signingActionLabelI18nKey)}
              </TransactionButton>
            )}
          </footer>
          <SharedSlideUpMenu
            isOpen={isSlideUpOpen && ledgerCannotSign}
            size="auto"
            close={() => setIsSlideUpOpen(false)}
          >
            <SignerLedgerConnect signingLedgerState={ledgerState} />
          </SharedSlideUpMenu>
          <style jsx>
            {`
              .signature-details {
                /*
                 * Adjust for fixed-position footer, plus some extra to visually
                 * deal with the drop shadow.
                 */
                margin-bottom: 84px;
              }
            `}
          </style>
        </>
      )}
    </>
  )
}
