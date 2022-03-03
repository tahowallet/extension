import React, { ReactElement } from "react"

import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"

import AccountItemOptionsMenu from "../AccountItem/AccountItemOptionsMenu"
import AccountItemSummary from "../AccountItem/AccountItemSummary"

interface Props {
  isSelected: boolean
  accountTotal: AccountTotal
  hideMenu: boolean
}

export default function SharedPanelAccountItem(props: Props): ReactElement {
  const { isSelected, hideMenu, accountTotal: account } = props

  return (
    <div className="standard_width container">
      <AccountItemSummary isSelected={isSelected} account={account} />
      <AccountItemOptionsMenu
        hideMenu={hideMenu}
        account={account}
        address={account.address}
        isSelected={isSelected}
      />

      <style jsx>{`
        .container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
        }
      `}</style>
    </div>
  )
}

SharedPanelAccountItem.defaultProps = {
  isSelected: false,
  hideMenu: false,
}
