import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import TransactionButton from "./TransactionButton"
import useShouldBlockSigning from "./useShouldBlockSigning"

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
  const { t: globalT } = useTranslation()
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const { shouldBlockSigning, messageI18nKey } = useShouldBlockSigning()

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

        <TransactionButton
          id="sign"
          type="primaryGreen"
          size="large"
          onClick={onConfirm}
          isDisabled={shouldBlockSigning}
          tooltip={messageI18nKey === undefined ? "" : globalT(messageI18nKey)}
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
