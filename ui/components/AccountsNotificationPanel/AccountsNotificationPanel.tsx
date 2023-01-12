import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"

type Props = {
  onCurrentAddressChange: (address: string) => void
}

export default function AccountsNotificationPanel({
  onCurrentAddressChange,
}: Props): ReactElement {
  const { t } = useTranslation()

  return (
    <SharedSlideUpMenuPanel
      header={t("accounts.notificationPanel.accountPanelName")}
    >
      <AccountsNotificationPanelAccounts
        onCurrentAddressChange={onCurrentAddressChange}
      />
    </SharedSlideUpMenuPanel>
  )
}
