import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  selectIsTransactionLoaded,
  selectTransactionData,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { useBackgroundSelector, useDebounce } from "../../../hooks"
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

  const transactionDetails = useBackgroundSelector(selectTransactionData)
  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )
  const hasInsufficientFunds =
    transactionDetails?.annotation?.warnings?.includes("insufficient-funds")

  const [isOnDelayToSign /* , setIsOnDelayToSign */] = useState(false)
  // Debounced unlock buttons because dispatching transaction events is async and can happen in batches
  const [unlockButtons, setUnlockButtons] = useDebounce(
    isTransactionDataReady,
    300
  )
  useEffect(
    () => setUnlockButtons(isTransactionDataReady),
    [isTransactionDataReady, setUnlockButtons]
  )

  return (
    <>
      <div className="signature-details">{children}</div>
      <footer>
        <SharedButton
          size="large"
          type="secondary"
          onClick={onReject}
          isDisabled={!unlockButtons}
        >
          {t("reject")}
        </SharedButton>

        <SharedButton
          type="primaryGreen"
          size="large"
          onClick={onConfirm}
          showLoadingOnClick
          isDisabled={isOnDelayToSign || !unlockButtons || hasInsufficientFunds}
        >
          {signingActionLabel} TEST
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
