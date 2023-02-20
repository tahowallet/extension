import { SECOND } from "@tallyho/tally-background/constants"
import {
  selectDefaultWallet,
  setNewDefaultWalletValue,
  setSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import classNames from "classnames"
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedToggleButton from "../Shared/SharedToggleButton"
import SharedTooltip from "../Shared/SharedTooltip"

export function WalletDefaultToggle(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.defaultToggle",
  })
  const dispatch = useDispatch()
  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)

  const toggleDefaultWallet = (defaultWalletValue: boolean) => {
    dispatch(setNewDefaultWalletValue(defaultWalletValue))
    if (defaultWalletValue) {
      dispatch(setSnackbarMessage(t("snackbar")))
    }
  }

  return (
    <>
      <SharedTooltip width={200}>{t("tooltip")}</SharedTooltip>
      <div className="toggle">
        <SharedToggleButton
          onChange={(toggleValue) => toggleDefaultWallet(toggleValue)}
          value={isDefaultWallet}
        />
      </div>
      <style jsx>{`
        .toggle {
          margin-left: auto;
        }
      `}</style>
    </>
  )
}
export default function WalletToggleDefaultBanner(): ReactElement {
  const { t } = useTranslation()
  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)
  const [isHidden, setIsHidden] = useState(isDefaultWallet)
  const timeout = useRef<number | undefined>()

  const resetTimeout = useCallback(() => {
    clearTimeout(timeout.current)
    timeout.current = undefined
  }, [])

  useEffect(() => {
    resetTimeout()
    if (isDefaultWallet) {
      timeout.current = window.setTimeout(() => setIsHidden(true), 5 * SECOND)
    }
  }, [isDefaultWallet, resetTimeout])

  return (
    <div
      className={classNames("default_toggle_container", {
        hidden: isHidden,
      })}
    >
      <div className="default_toggle">
        <div>
          <span className="highlight">{t("shared.taho")} </span>
          {isDefaultWallet
            ? t("wallet.defaultToggle.isDefault")
            : t("wallet.defaultToggle.notDefault")}
        </div>
        <WalletDefaultToggle />
      </div>
      <style jsx>{`
        .default_toggle {
          display: flex;
          align-items: center;
          box-sizing: border-box;
          width: 100%;
          background-color: var(--green-120);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          padding: 8px;
          border-radius: 8px;
        }
        .default_toggle_container {
          height: 40px;
          margin-bottom: 8px;
          width: calc(100% - 16px);
        }
        .default_toggle_container.hidden {
          opacity: 0;
          height: 0;
          margin-bottom: 0;
          pointer-events: none;
          transition: all 500ms;
        }
        .highlight {
          color: var(--trophy-gold);
        }
      `}</style>
    </div>
  )
}
