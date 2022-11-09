import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../Shared/SharedButton"

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

  const [isOnDelayToSign /* , setIsOnDelayToSign */] = useState(false)

  return (
    <>
      <div className="signature-details">{children}</div>
      <footer>
        <SharedButton size="large" type="secondary" onClick={onReject}>
          {t("reject")}
        </SharedButton>

        <SharedButton
          type="primaryGreen"
          size="large"
          onClick={onConfirm}
          showLoadingOnClick
          isDisabled={isOnDelayToSign}
        >
          {signingActionLabel}
        </SharedButton>
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
