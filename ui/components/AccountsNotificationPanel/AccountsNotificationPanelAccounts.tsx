import React, { ReactElement } from "react"
import { setSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { selectAccountTotals } from "@tallyho/tally-background/redux-slices/selectors"
import AccountsNotificationPanelAccountItem from "./AccountsNotificationPanelAccountItem"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

function WalletName() {
  return (
    <>
      <div className="wallet_title">
        <div className="left">
          <div className="icon_eye" />
          Read-only mode
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
        .icon_eye {
          background: url("./images/eye@2x.png");
          background-size: cover;
          width: 24px;
          height: 24px;
          margin: 0px 7px 0px 10px;
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
          display: none; // TODO Display when Add address is hooked up.
        }
      `}</style>
    </>
  )
}

export default function AccountsNotificationPanelAccounts(): ReactElement {
  const dispatch = useBackgroundDispatch()

  const accountTotals = useBackgroundSelector(selectAccountTotals)

  const selectedAccount = useBackgroundSelector((background) => {
    return background.ui.selectedAccount?.address
  })

  return (
    <div>
      <WalletName />
      <ul>
        {accountTotals.map((accountTotal, index) => {
          const lowerCaseAddress = accountTotal.address.toLocaleLowerCase()
          return (
            <li key={lowerCaseAddress}>
              <button
                type="button"
                onClick={() => {
                  dispatch(setSelectedAccount(lowerCaseAddress))
                }}
              >
                <AccountsNotificationPanelAccountItem
                  key={lowerCaseAddress}
                  accountTotal={accountTotal}
                  isSelected={lowerCaseAddress === selectedAccount}
                />
              </button>
            </li>
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
          linkTo="/onboarding/addWallet"
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
          li {
            margin-bottom: 16px;
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
