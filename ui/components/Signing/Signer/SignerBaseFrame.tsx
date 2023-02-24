import React, { ReactElement, useEffect, useRef, useState } from "react"
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

  /*
    Prevent shenanigans by disabling the sign button for a bit
    when rendering new sign content or when changing window focus.
  */
  const delaySignButtonTimeout = useRef<number | undefined>()

  const [isOnDelayToSign, setIsOnDelayToSign] = useState(false)
  // Debounced unlock buttons because dispatching transaction events is async and can happen in batches
  const [unlockButtons, setUnlockButtons] = useDebounce(
    isTransactionDataReady,
    300
  )
  const [focusChangeNonce, setFocusChangeNonce] = useState(0)

  function clearDelaySignButtonTimeout() {
    if (typeof delaySignButtonTimeout.current !== "undefined") {
      clearTimeout(delaySignButtonTimeout.current)
      delaySignButtonTimeout.current = undefined
    }
  }

  useEffect(
    () => setUnlockButtons(isTransactionDataReady),
    [isTransactionDataReady, setUnlockButtons]
  )

  useEffect(() => {
    const increaseFocusChangeNonce = () => {
      setFocusChangeNonce((x) => x + 1)
    }
    window.addEventListener("focus", increaseFocusChangeNonce)
    window.addEventListener("blur", increaseFocusChangeNonce)

    return () => {
      window.removeEventListener("focus", increaseFocusChangeNonce)
      window.removeEventListener("blur", increaseFocusChangeNonce)
    }
  }, [])

  // Runs on updates
  useEffect(() => {
    clearDelaySignButtonTimeout()

    if (document.hasFocus()) {
      delaySignButtonTimeout.current = window.setTimeout(() => {
        setIsOnDelayToSign(false)
        // Random delay between 0.5 and 2 seconds
      }, Math.floor(Math.random() * (5 - 1) + 1) * 500)
    } else {
      setIsOnDelayToSign(true)
    }
  }, [focusChangeNonce])

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
