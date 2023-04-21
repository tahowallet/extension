import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { selectHasInsufficientFunds } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectAdditionalSigningStatus } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../../../hooks"
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
    selectAdditionalSigningStatus
  )

  return (
    <>
      <div className="signature-details">{children}</div>
      <footer>
        <TransactionButton size="large" type="secondary" onClick={onReject}>
          {t("reject")}
        </TransactionButton>

        <TransactionButton
          type="primaryGreen"
          size="large"
          onClick={onConfirm}
          isDisabled={
            hasInsufficientFunds || additionalSigningStatus === "editing"
          }
          showLoadingOnClick
          showLoading
          reactOnWindowFocus
        >
          {signingActionLabel}
        </TransactionButton>
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
        `}
      </style>
    </>
  )
}
