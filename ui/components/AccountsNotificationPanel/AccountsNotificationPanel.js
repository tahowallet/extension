import React, { useState } from "react"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import AccountsNotificationPanelNotifications from "./AccountsNotificationPanelNotifications"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"

export default function TopMenuNotifications() {
  const [panelNum, setPanelNum] = useState(1)

  return (
    <div>
      <SharedPanelSwitcher
        setPanelNum={setPanelNum}
        panelNum={panelNum}
        panelNames={["Accounts", "Notifications"]}
      />
      {panelNum === 1 ? (
        <AccountsNotificationPanelNotifications />
      ) : (
        <AccountsNotificationPanelAccounts />
      )}
    </div>
  )
}
