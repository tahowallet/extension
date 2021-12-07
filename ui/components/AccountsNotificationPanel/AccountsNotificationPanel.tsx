import React, { ReactElement, useState } from "react"
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
        <AccountsNotificationPanelAccounts
          onCurrentAddressChange={onCurrentAddressChange}
        />
      )}
    </div>
  )
}
