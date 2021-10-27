import React, { ReactElement, useEffect, useState } from "react"
import { setSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import AccountsNotificationPanelAccountItem from "./AccountsNotificationPanelAccountItem"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

function WalletName() {
  return (
    <>
      <div className="wallet_title">
        <div className="left">
          <div className="icon_wallet" />
          Trezor
          <div className="icon_edit" />
        </div>
        <div className="right">
          <SharedButton
            type="tertiary"
            size="small"
            icon="plus"
            iconSize="medium"
            isDisabled
          >
            Add address
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        .wallet_title {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          padding: 0px 12px 0px 16px;
          margin-bottom: 16px;
          margin-top: 8px;
          align-items: center;
          display: flex;
          justify-content: space-between;
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
        .left {
          align-items: center;
          display: flex;
        }
        .right {
          align-items: center;
          display: flex;
        }
      `}</style>
    </>
  )
}

export default function AccountsNotificationPanelAccounts(): ReactElement {
  const [selectedWallet, setSelectedWallet] = useState(0)

  const dispatch = useBackgroundDispatch()

  const accountAddresses = useBackgroundSelector((background) => {
    return Object.keys(background.account.accountsData)
  })

  const selectedAccount = useBackgroundSelector((background) => {
    return background.ui.selectedAccount?.address
  })

  useEffect(() => {
    function selectFirstAccountIfNoneSelected() {
      if (selectedAccount === "" && accountAddresses[0]) {
        dispatch(setSelectedAccount(accountAddresses[0].toLowerCase()))
      }
    }
    selectFirstAccountIfNoneSelected()
  }, [dispatch, accountAddresses, selectedAccount])

  return (
    <div>
      <WalletName />
      <ul>
        {accountAddresses.map((item, index) => {
          const lowerCaseItem = item.toLocaleLowerCase()
          return (
            <button
              type="button"
              onClick={() => {
                setSelectedWallet(0)
                setSelectedAccount(index)
                dispatch(setSelectedAccount(lowerCaseItem))
              }}
            >
              <AccountsNotificationPanelAccountItem
                key={lowerCaseItem}
                address={lowerCaseItem.slice(0, 16)}
                isSelected={lowerCaseItem === selectedAccount}
              />
            </button>
          )
        })}
      </ul>
      <footer>
        <SharedButton
          type="tertiary"
          size="medium"
          icon="plus"
          iconSize="medium"
          iconPosition="left"
        >
          Add Wallet
        </SharedButton>
      </footer>
      <style jsx>
        {`
          ul {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            align-content: center;
          }
          footer {
            width: 100%;
            height: 48px;
            background-color: var(--hunter-green);
            position: fixed;
            bottom: 0px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 0px 12px;
            box-sizing: border-box;
          }
        `}
      </style>
      <style jsx global>{`
        .wallet_title:first-of-type {
          margin-top: 24px;
        }
      `}</style>
    </div>
  )
}
