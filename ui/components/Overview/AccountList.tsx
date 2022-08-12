import { getAddressCount } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useState } from "react"
import { useBackgroundSelector } from "../../hooks"
import SharedIcon from "../Shared/SharedIcon"
import AccountItem from "./AccountItem"

const mock = [
  { address: "xyz.eth", balance: "123", percent: "10%" },
  { address: "xyz.eth", balance: "123", percent: "10%" },
  // { address: "xyz.eth", balance: "123", percent: "10%" },
  // { address: "xyz.eth", balance: "123", percent: "10%" },
  // { address: "xyz.eth", balance: "123", percent: "10%" },
  // { address: "xyz.eth", balance: "123", percent: "10%" },
  // { address: "xyz.eth", balance: "123", percent: "10%" },
]

const getItem = () => <AccountItem />

export default function AccountList(): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const accountsCount = useBackgroundSelector(getAddressCount)
  const accounts = mock

  const isCollapsible = accounts.length > 3
  const toggle = () => setIsOpen((prev) => !prev)

  return (
    <>
      <div className="accounts_list">
        <div className="accounts_header">
          <span>Accounts({accountsCount})</span>
          {isCollapsible && (
            <button
              type="button"
              className="accounts_toggle"
              onClick={() => toggle()}
            >
              {isOpen ? "Collapse" : "View all"}
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
          {isCollapsible
            ? (isOpen ? accounts : accounts.slice(0, 3)).map(getItem)
            : accounts.map(getItem)}
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
