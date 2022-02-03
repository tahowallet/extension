import React, { ReactElement, useCallback, useEffect, useRef } from "react"
import { useDispatch } from "react-redux"
import classNames from "classnames"
import {
  selectSnackbarMessage,
  clearSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector, useDelayContentChange } from "../../hooks"

// Number of ms before a snackbar message dismisses; changing the message will
// extend visibility by this much.
const DISMISS_MS = 2500
// Number of ms that it takes for the snackbar to disappear after it's
// dismissed.
const DISMISS_ANIMATION_MS = 300

export default function Snackbar(): ReactElement {
  const dispatch = useDispatch()

  const snackbarMessage = useBackgroundSelector(selectSnackbarMessage)
  const shouldHide = snackbarMessage.trim() === ""
  // Delay the display message clearing to allow the animation to complete
  // before the message is hidden.
  const displayMessage = useDelayContentChange(
    snackbarMessage,
    shouldHide,
    DISMISS_ANIMATION_MS
  )

  const snackbarTimeout = useRef<number | undefined>()

  const clearSnackbarTimeout = useCallback(() => {
    if (typeof snackbarTimeout.current !== "undefined") {
      clearTimeout(snackbarTimeout.current)
      snackbarTimeout.current = undefined
    }
  }, [])

  useEffect(() => {
    clearSnackbarTimeout()

    snackbarTimeout.current = window.setTimeout(() => {
      dispatch(clearSnackbarMessage())
    }, DISMISS_MS)
  }, [snackbarMessage, clearSnackbarTimeout, dispatch])

  useEffect(() => {
    window.onblur = () => {
      clearSnackbarTimeout()
      dispatch(clearSnackbarMessage())
    }
  }, [clearSnackbarTimeout, dispatch])

  return (
    <div className={classNames("snackbar_wrap", { hidden: shouldHide })}>
      {displayMessage}
      <style jsx>
        {`
          .snackbar_wrap {
            max-width: 352px;
            width: auto;
            height: 40px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 500;
            position: fixed;
            bottom: 72px;
            z-index: 999999999;
            background: var(--green-120);
            color: var(--green-20);
            box-shadow: 0px 24px 24px rgba(0, 20, 19, 0.14),
              0px 14px 16px rgba(0, 20, 19, 0.24),
              0px 10px 12px rgba(0, 20, 19, 0.34);
            border-radius: 8px;
            transition: all ${DISMISS_ANIMATION_MS}ms ease;
            opacity: 1;
            transform: translateY(0px);
            user-select: none;
          }
          .hidden {
            opacity: 0;
            transform: translateY(10px);
          }
        `}
      </style>
    </div>
  )
}
