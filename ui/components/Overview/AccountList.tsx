import { AccountTotalList } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedIcon from "../Shared/SharedIcon"
import AccountItem from "./AccountItem"

const getAccountsList = (accountsTotal: AccountTotalList) => {
  let totalsSum = 0

  const list = Object.values(accountsTotal).map(
    ({ ensName, totals, shortenedAddress }) => {
      const total = Object.values(totals).reduce(
        (sum, current) => sum + current,
        0
      )

      totalsSum += total

      return {
        name: ensName ?? shortenedAddress,
        total,
        percent: 0,
      }
    }
  )

  list.forEach((accountTotal) => {
    // eslint-disable-next-line no-param-reassign
    accountTotal.percent = Math.round(
      totalsSum ? (accountTotal.total / totalsSum) * 100 : 0
    )
  })

  list.sort((account1, account2) => account2.percent - account1.percent)

  return list
}

export default function AccountList({
  accountsTotal,
  accountsCount,
}: {
  accountsTotal: AccountTotalList
  accountsCount: number
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()
  const accounts = getAccountsList(accountsTotal)

  const isCollapsible = accounts.length > 3
  const toggle = () => setIsOpen((prev) => !prev)

  return (
    <>
      <div className="accounts_list">
        <div className="accounts_header">
          <span>
            {t("overview.accounts")}({accountsCount})
          </span>
          {isCollapsible && (
            <button
              type="button"
              className="accounts_toggle"
              onClick={() => toggle()}
            >
              {isOpen ? t("toggle.collapse") : t("toggle.viewAll")}
              <SharedIcon
                icon="icons/s/arrow-toggle.svg"
                width={12}
                height={10}
                color="var(--green-40)"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle()
                }}
                customStyles={`
                margin-left: 5px;
                transform: rotate(${isOpen ? "180" : "0"}deg);
                transition: transform 100ms;
              `}
              />
            </button>
          )}
        </div>
        <div>
          {(!isCollapsible || isOpen ? accounts : accounts.slice(0, 3)).map(
            ({ name, total, percent }) => (
              <AccountItem
                key={name}
                name={name}
                total={total}
                percent={percent}
              />
            )
          )}
        </div>
      </div>
      <style jsx>{`
        .accounts_list {
          margin-bottom: 16px;
        }
        .accounts_header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 12px;
          line-height: 16px;
          color: var(--green-40);
        }
        .accounts_toggle {
          display: flex;
          align-items: center;
        }
        .accounts_toggle:hover {
          color: var(--green-5);
        }
      `}</style>
      <style global jsx>
        {`
          .accounts_toggle:hover button {
            background-color: var(--green-5);
          }
        `}
      </style>
    </>
  )
}
