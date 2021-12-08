import React, { ReactElement, useEffect, useState } from "react"
import { setCurrentAccount } from "@tallyho/tally-background/redux-slices/ui"
import { selectAccountTotalsByCategory } from "@tallyho/tally-background/redux-slices/selectors"
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
    title: "Read-only mode",
    icon: "./images/eye@2x.png",
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
          margin: 8px 0 16px;
        }
        .icon {
          background: url("${icon}");
          background-size: cover;
          width: 24px;
          height: 24px;
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

  const selectedAccount = useBackgroundSelector((background) => {
    return background.ui.currentAccount?.address
  })

  const updateCurrentAccount = (address: string) => {
    setPendingSelectedAddress(address)
    dispatch(setCurrentAccount(address))
  }

  useEffect(() => {
    if (
      pendingSelectedAddress !== "" &&
      pendingSelectedAddress === selectedAccount
    ) {
      onCurrentAddressChange(pendingSelectedAddress)
      setPendingSelectedAddress("")
    }
  }, [onCurrentAddressChange, pendingSelectedAddress, selectedAccount])

  return (
    <div>
      {[AccountType.Imported, AccountType.ReadOnly]
        .filter((type) => (accountTotals[type]?.length ?? 0) > 0)
        .map((accountType) => {
          // Known-non-null due to above filter.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const accountTypeTotals = accountTotals[accountType]!

          return (
            <section>
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
                          isSelected={lowerCaseAddress === selectedAccount}
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
    </div>
  )
}
