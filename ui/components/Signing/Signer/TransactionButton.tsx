import React, { ReactElement, useEffect, useRef, useState } from "react"
import { selectIsTransactionLoaded } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { useBackgroundSelector, useDebounce } from "../../../hooks"
import SharedButton, {
  Props as SharedButtonProps,
} from "../../Shared/SharedButton"

export default function TransactionButton({
  type,
  size,
  isDisabled,
  onClick,
  children,
  reactOnWindowFocus = false,
}: SharedButtonProps & { reactOnWindowFocus?: boolean }): ReactElement {
  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )
  /*
    Prevent shenanigans by disabling the sign button for a bit
    when changing window focus.
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
      }, Math.floor(Math.random() * 4 + 1) * 500)
    } else {
      setIsOnDelayToSign(true)
    }
  }, [focusChangeNonce])

  return (
    <>
      <SharedButton
        type={type}
        size={size}
        onClick={onClick}
        showLoadingOnClick
        isDisabled={
          (reactOnWindowFocus ? isOnDelayToSign : false) ||
          !unlockButtons ||
          isDisabled
        }
      >
        {children}
      </SharedButton>
    </>
  )
}
