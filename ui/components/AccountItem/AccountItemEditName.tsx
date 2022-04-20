import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"
import React, { ReactElement } from "react"
import { useDispatch } from "react-redux"
import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import AccountItemActionHeader from "./AccountItemActionHeader"

interface AccountItemEditNameProps {
  account: AccountTotal
  address: HexString
  close: () => void
}

export default function AccountItemEditName({
  account,
  address,
  close,
}: AccountItemEditNameProps): ReactElement {
  const dispatch = useDispatch()
  return (
    <div className="remove_address_option">
      <div className="header">
        <AccountItemActionHeader
          label="Edit name"
          icon="icons/s/edit.svg"
          color="#fff"
        />
      </div>
      <ul>
        <li className="account_container">
          <li className="standard_width">
            <SharedAccountItemSummary
              accountTotal={account}
              isSelected={false}
            />
          </li>
        </li>
      </ul>
      <div className="details">
        This Is Where Input Will Go This Is Where Input Will Go This Is Where
        Input Will Go This Is Where Input Will Go This Is Where Input Will Go{" "}
      </div>
      <div className="button_container">
        <SharedButton
          type="secondary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          Cancel
        </SharedButton>
        <SharedButton
          type="primary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          Save name
        </SharedButton>
      </div>
      <style jsx>{`
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
        }
        .header {
          height: 24px;
        }
        .remove_address_option {
          margin-left: 20px;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 95%;
        }
        .details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size 16px;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .account_container {
          margin-top: -10px;
          background-color: var(--hunter-green);
          padding: 5px;
          border-radius: 16px;
        }
      `}</style>
    </div>
  )
}
