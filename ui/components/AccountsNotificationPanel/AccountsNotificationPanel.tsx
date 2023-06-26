import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"

type Props = {
  isOpen: boolean
  close: () => void
}

export default function AccountsNotificationPanel({
  isOpen,
  close,
}: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.notificationPanel",
  })

  return (
    <SharedSlideUpMenu
      header={t("accountPanelName")}
      isOpen={isOpen}
      close={close}
    >
      <AccountsNotificationPanelAccounts onCurrentAddressChange={close} />
    </SharedSlideUpMenu>
  )
}
