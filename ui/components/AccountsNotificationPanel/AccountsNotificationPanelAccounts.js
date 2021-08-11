import React from "react"
import AccountsNotificationPanelAccountItem from "./AccountsNotificationPanelAccountItem"

export default function AccountsNotificationPanelAccounts() {
  return (
    <div>
      <ul>{Array(3).fill("").map(AccountsNotificationPanelAccountItem)}</ul>
      <style jsx>{`
        ul {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  )
}
