import { getAddressCount } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import AccountItem from "./AccountItem"

export default function AccountList(): ReactElement {
  const accountsCount = useBackgroundSelector(getAddressCount)

  return (
    <>
      <div className="accounts_list">
        <div className="accounts_header">
          <span>Accounts({accountsCount})</span>
        </div>
        <div>
          <AccountItem />
          <AccountItem />
          <AccountItem />
        </div>
      </div>
      <style jsx>{`
        .accounts_list {
          margin-bottom: 16px;
        }
        .accounts_header {
          font-weight: 600;
          font-size: 12px;
          line-height: 16px;
          color: var(--green-40);
        }
      `}</style>
    </>
  )
}
