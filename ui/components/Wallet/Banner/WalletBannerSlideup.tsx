import {
  setSnackbarMessage,
  toggleHideBanners,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../../hooks"
import SharedButton from "../../Shared/SharedButton"
import SharedSlideUpMenu from "../../Shared/SharedSlideUpMenu"

export default function WalletBannerSlideup(props: {
  isOpen: boolean
  onDismiss: () => void
  onClose: () => void
}): ReactElement {
  const { isOpen, onClose, onDismiss } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.banner",
  })
  const dispatch = useBackgroundDispatch()

  const dismiss = () => {
    onDismiss()
    onClose()
  }
  const toggleSettings = () => {
    dispatch(toggleHideBanners(true))
    dispatch(setSnackbarMessage(t("snackbar")))
    onClose()
  }
  return (
    <SharedSlideUpMenu
      size="custom"
      customSize="230px"
      isOpen={isOpen}
      close={onClose}
    >
      <div className="wallet_banner_slideup">
        <h3>{t("notificationTitle")}</h3>
        <p>{t("notificationDismissInfo")}</p>
        <div className="wallet_banner_slideup_buttons">
          <SharedButton type="primary" size="medium" onClick={dismiss}>
            {t("showNotifications")}
          </SharedButton>
          <SharedButton type="tertiary" size="medium" onClick={toggleSettings}>
            {t("dontShowNotifications")}
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        h3 {
          color: var(--error);
          font-size: 18px;
          line-height: 24px;
          font-weight: 600;
          margin: 0 0 16px;
        }
        p {
          margin: 0 0 32px;
          color: var(--green-20)
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
        .wallet_banner_slideup {
          margin: 0 24px;
        }
        .wallet_banner_slideup_buttons {
          display: flex;
          justify-content: space-between;
          margin-right: 10px;
        }
      `}</style>
    </SharedSlideUpMenu>
  )
}
