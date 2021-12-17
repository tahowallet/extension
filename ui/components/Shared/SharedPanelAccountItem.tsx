import React, { ReactElement } from "react"

import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"

import SharedLoadingSpinner from "./SharedLoadingSpinner"

interface Props {
  isSelected: boolean
  accountTotal: AccountTotal
  hideMenu: boolean
}

export default function SharedPanelAccountItem(props: Props): ReactElement {
  const { isSelected, hideMenu, accountTotal: account } = props
  const {
    shortenedAddress,
    name,
    avatarURL,
    localizedTotalMainCurrencyAmount,
  } = account

  return (
    <li className="standard_width">
      <div className="left">
        {isSelected ? (
          <div className="avatar_selected_outline">
            <div className="avatar" />
          </div>
        ) : (
          <div className="avatar" />
        )}

        <div className="info">
          <div className="address_name">
            {typeof name === "undefined" ? shortenedAddress : name}
          </div>
          <div className="address">
            {typeof name !== "undefined" ? shortenedAddress : ""}
          </div>
        </div>
      </div>
      <div className="right">
        <div className="balance_status">
          {typeof localizedTotalMainCurrencyAmount === "undefined" ? (
            <SharedLoadingSpinner size="small" />
          ) : (
            <div className="balance">
              <span className="lighter">$</span>
              {localizedTotalMainCurrencyAmount}
            </div>
          )}
          {isSelected ? (
            <div className="connected_status">Connected</div>
          ) : null}
        </div>
        {!hideMenu && <div className="icon_settings" />}
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
        .avatar {
          background: url("${avatarURL ?? "./images/avatar@2x.png"}") center
            no-repeat;
          background-color: var(--green-40);
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
        }
        .avatar_selected_outline {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          border: 2px solid #22c480;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-left: -4px;
          margin-right: -4px;
        }
        .left {
          display: flex;
          align-items: center;
        }
        .avatar {
          width: 48px;
          height: 48px;
        }
        .address_name {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
        }
        .address {
          color: var(--green-40);
          font-size: 16px;
        }
        .balance {
          text-align: right;
          color: #fff;
          font-size: 16px;
        }
        .connected_status {
          color: #22c480;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          text-align: right;
        }
        .info {
          margin-left: 16px;
        }
        .lighter {
          color: var(--green-40);
        }
        .icon_settings {
          background: url("./images/more_dots@2x.png") center no-repeat;
          background-size: cover;
          width: 4px;
          height: 20px;
          margin-left: 16px;
        }
        .right {
          display: flex;
          align-items: center;
        }
      `}</style>
    </li>
  )
}

SharedPanelAccountItem.defaultProps = {
  isSelected: false,
  hideMenu: false,
}
