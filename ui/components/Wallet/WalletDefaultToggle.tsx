import {
  selectDefaultWallet,
  setNewDefaultWalletValue,
  setSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedToggleButton from "../Shared/SharedToggleButton"
import SharedTooltip from "../Shared/SharedTooltip"

export default function WalletDefaultToggle(): ReactElement {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)

  const toggleDefaultWallet = (defaultWalletValue: boolean) => {
    dispatch(setNewDefaultWalletValue(defaultWalletValue))
    if (defaultWalletValue) {
      dispatch(setSnackbarMessage(t("wallet.defaultToggle.snackbar")))
    }
  }
  return (
    <div className="default_toggle">
      <div>
        <span className="highlight">{t("shared.tallyHo")} </span>
        {isDefaultWallet
          ? t("wallet.defaultToggle.isDefault")
          : t("wallet.defaultToggle.notDefault")}
      </div>
      <SharedTooltip width={200}>
        {t("wallet.defaultToggle.tooltip")}
      </SharedTooltip>
      <div className="toggle">
        <SharedToggleButton
          onChange={(toggleValue) => toggleDefaultWallet(toggleValue)}
          value={isDefaultWallet}
        />
      </div>
      <style jsx>{`
        .default_toggle {
          display: flex;
          align-items: center;
          box-sizing: border-box;
          width: calc(100% - 16px);
          background-color: var(--green-120);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          padding: 8px;
          margin: 0 8px 8px;
          border-radius: 8px;
        }
        .toggle {
          margin-left: auto;
        }
        .highlight {
          color: var(--trophy-gold);
        }
      `}</style>
    </div>
  )
}
