import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"

type Props = {
  onCurrentAddressChange: (address: string) => void
}

export default function AccountsNotificationPanel({
  onCurrentAddressChange,
}: Props): ReactElement {
  const { t } = useTranslation()

  return (
    <div>
      <div className="panel_switcher_wrap">
        <h3>{t("accounts.notificationPanel.accountPanelName")}</h3>
      </div>
      <AccountsNotificationPanelAccounts
        onCurrentAddressChange={onCurrentAddressChange}
      />
      <style jsx>{`
        h3 {
          padding-left: 24px;
          padding-bottom: 16px;
          margin: 0;
        }
        .panel_switcher_wrap {
          width: 100%;
          background-color: var(--green-95);
          position: sticky;
          top: -25px;
          padding-top: 25px;
          margin-top: -25px;
          z-index: 1;
          border-bottom: 1px solid var(--green-120);
        }
      `}</style>
    </div>
  )
}
