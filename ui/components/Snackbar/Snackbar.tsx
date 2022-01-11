import React, { ReactElement, useEffect, useRef } from "react"
import { useDispatch } from "react-redux"
import classNames from "classnames"
import {
  selectSnackbarMessage,
  clearSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector } from "../../hooks"

export default function Snackbar(): ReactElement {
  const dispatch = useDispatch()
  const snackbarMessage = useBackgroundSelector(selectSnackbarMessage)
  const msTillDismiss = 2500

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout>>()

  const clearSnackbarTimeout = () => {
    if (snackbarTimeout.current) {
      clearTimeout(snackbarTimeout.current)
    }
  }

  useEffect(() => {
    clearSnackbarTimeout()

    snackbarTimeout.current = setTimeout(() => {
      dispatch(clearSnackbarMessage())
    }, msTillDismiss)
  }, [snackbarTimeout, snackbarMessage, msTillDismiss, dispatch])

  useEffect(() => {
    window.onblur = () => {
      clearSnackbarTimeout()
      dispatch(clearSnackbarMessage())
    }
  }, [dispatch])

  return (
    <div className={classNames("snackbar_wrap", { open: snackbarMessage })}>
      {snackbarMessage}
      <style jsx>
        {`
          .snackbar_wrap {
            width: 352px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            position: fixed;
            bottom: 30px;
            z-index: 999999999;
            background: var(--green-120);
            box-shadow: 0px 24px 24px rgba(0, 20, 19, 0.14),
              0px 14px 16px rgba(0, 20, 19, 0.24),
              0px 10px 12px rgba(0, 20, 19, 0.34);
            border-radius: 8px;
            transition: all 0.3s ease;
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
          }
          .open {
            opacity: 1;
            transform: translateY(0px);
          }
        `}
      </style>
    </div>
  )
}
