import React, { ReactElement, useState } from "react"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import AccountsNotificationPanelNotifications from "./AccountsNotificationPanelNotifications"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"

export default function TopMenuNotifications(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <div>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Accounts"]}
      />
      {panelNumber === 1 ? (
        <AccountsNotificationPanelNotifications />
      ) : (
        <AccountsNotificationPanelAccounts />
      )}
    </div>
  )
}
