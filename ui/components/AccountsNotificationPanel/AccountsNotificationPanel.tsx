import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import AccountsNotificationPanelNotifications from "./AccountsNotificationPanelNotifications"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"

type Props = {
  onCurrentAddressChange: (address: string) => void
}

export default function TopMenuNotifications({
  onCurrentAddressChange,
}: Props): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)
  const { t } = useTranslation()

  return (
    <div>
      <div className="panel_switcher_wrap">
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={[t("accounts.notificationPanel.accountPanelName")]}
        />
      </div>
      {panelNumber === 1 ? (
        <AccountsNotificationPanelNotifications />
      ) : (
        <AccountsNotificationPanelAccounts
          onCurrentAddressChange={onCurrentAddressChange}
        />
      )}
      <style jsx>{`
        .panel_switcher_wrap {
          width: 100%;
          background-color: var(--green-95);
          position: sticky;
          top: -25px;
          padding-top: 25px;
          margin-top: -25px;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}
