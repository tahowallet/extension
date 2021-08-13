import React, { useState } from "react"
import AccountsNotificationPanelAccountItem from "./AccountsNotificationPanelAccountItem"

export default function AccountsNotificationPanelAccounts() {
  const [selectedAccount, setSelectedAccount] = useState(1)
  const [selectedWallet, setSelectedWallet] = useState(0)

  return (
    <div>
      <div className="wallet_title">
        <div className="icon_wallet" />
        Trezor
        <div className="icon_edit" />
      </div>
      <ul>
        {Array(1)
          .fill("")
          .map((item, index) => {
            return (
              <button
                type="button"
                onClick={() => {
                  setSelectedWallet(0)
                  setSelectedAccount(index)
                }}
              >
                <AccountsNotificationPanelAccountItem
                  isSelected={index === selectedAccount && selectedWallet === 0}
                />
              </button>
            )
          })}
      </ul>
      <div className="wallet_title">
        <div className="icon_wallet" />
        Trezor
        <div className="icon_edit" />
      </div>
      <ul>
        {Array(3)
          .fill("")
          .map((item, index) => {
            return (
              <button
                type="button"
                onClick={() => {
                  setSelectedWallet(1)

                  setSelectedAccount(index)
                }}
              >
                <AccountsNotificationPanelAccountItem
                  isSelected={index === selectedAccount && selectedWallet === 1}
                />
              </button>
            )
          })}
      </ul>
      <style jsx>
        {`
          ul {
            flex-direction: column;
          }
          .wallet_title {
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            padding-left: 16px;
            margin-bottom: 16px;
            margin-top: 8px;
            align-items: center;
          }
          .wallet_title:first-of-type {
            margin-top: 24px;
          }
          .icon_wallet {
            background: url("./images/wallet_kind_icon@2x.png") center no-repeat;
            background-size: cover;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .icon_edit {
            background: url("./images/edit@2x.png") center no-repeat;
            background-size: cover;
            width: 13px;
            height: 13px;
            margin-left: 8px;
          }
        `}
      </style>
    </div>
  )
}
