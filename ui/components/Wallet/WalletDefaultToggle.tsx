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
