import {
  SignOperationType,
  selectAdditionalSigningStatus,
} from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  selectHasInsufficientFunds,
  selectIsSigningNetworkUnreachable,
  selectTransactionNetwork,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { useHistory } from "react-router-dom"
import { LedgerAccountSigner } from "@tallyho/tally-background/services/ledger"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useSigningLedgerState,
} from "../../../../hooks"
import { SignerFrameProps } from ".."
import NetworkUnreachableWarning from "../../../Shared/NetworkUnreachableWarning"
import SharedButton from "../../../Shared/SharedButton"
import SharedSlideUpMenu from "../../../Shared/SharedSlideUpMenu"
import SignerLedgerConnect from "./SignerLedgerConnect"
import SignerLedgerSigning from "./SignerLedgerSigning"
import SignerLedgerConnectionStatus from "./SignerLedgerConnectionStatus"
import TransactionButton from "../TransactionButton"

export default function SignerLedgerFrame<
  T extends SignOperationType,
  S extends LedgerAccountSigner,
>({
  children,
  request,
  signer,
  signingAddress,
  signingActionLabelI18nKey,
  signActionCreator,
  rejectActionCreator,
  redirectToActivityPage,
}: SignerFrameProps<T, S>): ReactElement {
  const { t: globalT } = useTranslation()
  const { t } = useTranslation("translation", { keyPrefix: "ledger" })
  const { t: tSigning } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })

  const [isSigning, setIsSigning] = useState(false)
  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  const handleConfirm = useCallback(() => {
    dispatch(signActionCreator()).finally(() => {
      // Redirect to activity page after submitting
      if (redirectToActivityPage) {
        history.push("/", { goTo: "activity-page" })
      }
    })
    setIsSigning(true)
  }, [dispatch, history, redirectToActivityPage, signActionCreator])

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
  const additionalSigningStatus = useBackgroundSelector(
    selectAdditionalSigningStatus,
  )

  const mustEnableArbitraryDataSigning =
    ledgerState.state === "available" &&
    isArbitraryDataSigningRequired &&
    !ledgerState.arbitraryDataEnabled

  const ledgerCannotSign =
    ledgerState.state !== "available" || mustEnableArbitraryDataSigning

  const isNetworkUnreachable = useBackgroundSelector(
    selectIsSigningNetworkUnreachable,
  )
  const transactionNetwork = useBackgroundSelector(selectTransactionNetwork)

  // Unreachable takes precedence: unsaved fee edits are the user's own doing
  // and reversible, while a chain we cannot read makes the fees and the nonce
  // unverifiable no matter what they say.
  const tooltip =
    (isNetworkUnreachable && tSigning("networkUnreachableTooltip")) ||
    (additionalSigningStatus === "editing" &&
      tSigning("unsavedChangesTooltip")) ||
    ""

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

            {/*
             * The footer is laid out by a `:global()` rule in ../../index.tsx
             * that spreads exactly two children apart; the warning shares the
             * right-hand slot so adding it does not re-space the whole row. It
             * belongs beside the Check Ledger button too — a chain that cannot
             * be reached is a reason not to sign whatever the Ledger's state.
             */}
            <div className="sign_group">
              {isNetworkUnreachable && transactionNetwork !== undefined && (
                <NetworkUnreachableWarning
                  chainID={transactionNetwork.chainID}
                  style={{ margin: 0 }}
                  tooltipVerticalPosition="top"
                />
              )}
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
                    additionalSigningStatus === "editing" ||
                    isNetworkUnreachable
                  }
                  tooltip={tooltip}
                  showLoadingOnClick
                  showLoading
                  reactOnWindowFocus
                >
                  {globalT(signingActionLabelI18nKey)}
                </TransactionButton>
              )}
            </div>
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
              .sign_group {
                display: flex;
                align-items: center;
                gap: 8px;
              }
            `}
          </style>
        </>
      )}
    </>
  )
}
