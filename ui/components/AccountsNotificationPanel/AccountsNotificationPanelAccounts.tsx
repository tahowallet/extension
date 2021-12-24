import React, { ReactElement, useEffect, useState } from "react"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import {
  selectAccountTotalsByCategory,
  selectCurrentAccount,
} from "@tallyho/tally-background/redux-slices/selectors"
import { ETHEREUM } from "@tallyho/tally-background/constants/networks"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import SharedPanelAccountItem from "../Shared/SharedPanelAccountItem"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

type WalletTypeInfo = {
  title: string
  icon: string
}

const walletTypeDetails: { [key in AccountType]: WalletTypeInfo } = {
  [AccountType.ReadOnly]: {
    title: "Read-only",
    icon: "./images/eye_account@2x.png",
  },
  [AccountType.Imported]: {
    title: "Imported",
    icon: "./images/imported@2x.png",
  },
}

function WalletTypeHeader({
  accountType,
  canAddAddress,
}: {
  accountType: AccountType
  canAddAddress: boolean
}) {
  const { title, icon } = walletTypeDetails[accountType]

  return (
    <>
      <header className="wallet_title">
        <h2 className="left">
          <div className="icon" />
          {title}
        </h2>
        {canAddAddress ? (
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
        ) : (
          <></>
        )}
      </header>
      <style jsx>{`
        .wallet_title {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .wallet_title > h2 {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          padding: 0px 12px 0px 16px;
          margin: 8px 0px;
        }
        .icon {
          background: url("${icon}");
          background-size: cover;
          background-color: #faf9f4;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          margin: 0 7px 0 0;
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

type Props = {
  onCurrentAddressChange: (newAddress: string) => void
}

export default function AccountsNotificationPanelAccounts({
  onCurrentAddressChange,
}: Props): ReactElement {
  const dispatch = useBackgroundDispatch()

  const accountTotals = useBackgroundSelector(selectAccountTotalsByCategory)

  const [pendingSelectedAddress, setPendingSelectedAddress] = useState("")

  const selectedAccountAddress =
    useBackgroundSelector(selectCurrentAccount).address

  const updateCurrentAccount = (address: string) => {
    setPendingSelectedAddress(address)
    dispatch(
      setNewSelectedAccount({
        address,
        network: ETHEREUM,
      })
    )
  }

  useEffect(() => {
    if (
      pendingSelectedAddress !== "" &&
      pendingSelectedAddress === selectedAccountAddress
    ) {
      onCurrentAddressChange(pendingSelectedAddress)
      setPendingSelectedAddress("")
    }
  }, [onCurrentAddressChange, pendingSelectedAddress, selectedAccountAddress])

  return (
    <div>
      {[AccountType.Imported, AccountType.ReadOnly]
        .filter((type) => (accountTotals[type]?.length ?? 0) > 0)
        .map((accountType) => {
          // Known-non-null due to above filter.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const accountTypeTotals = accountTotals[accountType]!

          return (
            <section key={accountType}>
              <WalletTypeHeader
                accountType={accountType}
                canAddAddress={false}
              />
              <ul>
                {accountTypeTotals.map((accountTotal) => {
                  const lowerCaseAddress =
                    accountTotal.address.toLocaleLowerCase()
                  return (
                    <li key={lowerCaseAddress}>
                      <button
                        type="button"
                        onClick={() => {
                          updateCurrentAccount(lowerCaseAddress)
                        }}
                      >
                        <SharedPanelAccountItem
                          key={lowerCaseAddress}
                          accountTotal={accountTotal}
                          isSelected={
                            lowerCaseAddress === selectedAccountAddress
                          }
                          hideMenu
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
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
            margin-bottom: 8px;
          }
          li {
            width: 100%;
            box-sizing: border-box;
            padding: 8px 0px 8px 24px;
          }
          li:hover {
            background-color: var(--hunter-green);
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
          section:first-of-type {
            margin-top: 16px;
          }
        `}
      </style>
    </div>
  )
}
