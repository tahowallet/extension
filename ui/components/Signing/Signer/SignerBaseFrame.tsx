import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import {
  selectHasInsufficientFunds,
  selectIsSigningNetworkUnreachable,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectAdditionalSigningStatus } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../../../hooks"
import NetworkUnreachableWarning from "../../Shared/NetworkUnreachableWarning"
import TransactionButton from "./TransactionButton"

type SignerBaseFrameProps = {
  signingActionLabel: string
  onConfirm: () => void
  onReject: () => void
  children: ReactElement
}

export default function SignerBaseFrame({
  children,
  signingActionLabel,
  onConfirm,
  onReject,
}: SignerBaseFrameProps): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const hasInsufficientFunds = useBackgroundSelector(selectHasInsufficientFunds)
  const additionalSigningStatus = useBackgroundSelector(
    selectAdditionalSigningStatus,
  )
  const isNetworkUnreachable = useBackgroundSelector(
    selectIsSigningNetworkUnreachable,
  )
  const tooltip =
    additionalSigningStatus === "editing" ? t("unsavedChangesTooltip") : ""

  return (
    <>
      <div className="signature-details">{children}</div>
      <footer>
        <TransactionButton
          id="reject"
          size="large"
          type="secondary"
          onClick={onReject}
        >
          {t("reject")}
        </TransactionButton>

        {/*
         * The footer is laid out by a `:global()` rule in ../index.tsx that
         * spreads exactly two children apart; the warning shares the sign
         * button's slot so adding it does not re-space the whole row.
         */}
        <div className="sign_group">
          {isNetworkUnreachable && (
            <NetworkUnreachableWarning
              style={{ margin: 0 }}
              tooltipVerticalPosition="top"
            />
          )}
          <TransactionButton
            id="sign"
            type="primaryGreen"
            size="large"
            onClick={onConfirm}
            isDisabled={
              hasInsufficientFunds || additionalSigningStatus === "editing"
            }
            tooltip={tooltip}
            showLoadingOnClick
            showLoading
            reactOnWindowFocus
          >
            {signingActionLabel}
          </TransactionButton>
        </div>
      </footer>
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
  )
}
