import React, { ReactElement } from "react"

import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"

import AccountItemOptionsMenu from "../AccountItem/AccountItemOptionsMenu"
import AccountItemSummary from "../AccountItem/AccountItemSummary"

interface Props {
  isSelected: boolean
  accountTotal: AccountTotal
  hideMenu: boolean
  address: HexString
}

export default function SharedPanelAccountItem(props: Props): ReactElement {
  const { isSelected, hideMenu, accountTotal: account, address } = props

  return (
    <li className="standard_width">
      <AccountItemSummary isSelected={isSelected} account={account} />
      <AccountItemOptionsMenu
        hideMenu={hideMenu}
        account={account}
        address={address}
        isSelected={isSelected}
      />

      <style jsx>{`
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
        }
      `}</style>
    </li>
  )
}

SharedPanelAccountItem.defaultProps = {
  isSelected: false,
  hideMenu: false,
}
