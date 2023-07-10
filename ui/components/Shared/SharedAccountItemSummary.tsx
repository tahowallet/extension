import React, { ReactElement } from "react"

import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"

import { useTranslation } from "react-i18next"
import SharedLoadingSpinner from "./SharedLoadingSpinner"

interface Props {
  isSelected?: boolean
  accountTotal: AccountTotal
  children?: React.ReactNode
  style?: React.CSSProperties & Record<string, unknown>
}

export default function SharedAccountItemSummary(props: Props): ReactElement {
  const { isSelected, accountTotal, children, style } = props
  const { t } = useTranslation()
  const {
    address,
    shortenedAddress,
    name,
    avatarURL,
    localizedTotalMainCurrencyAmount,
  } = accountTotal

  return (
    <div className="item-summary standard_width" style={style}>
      <div className="summary">
        <div className="left">
          {isSelected ? (
            <div className="avatar_selected_outline">
              <div className="avatar" />
            </div>
          ) : (
            <div className="avatar" />
          )}

          <div className="info">
            <div
              className="address_name"
              title={typeof name === "undefined" ? address : name}
            >
              {typeof name === "undefined" ? shortenedAddress : name}{" "}
            </div>
            <div
              className="address"
              title={typeof name === "undefined" ? "" : address}
            >
              {typeof name !== "undefined" ? shortenedAddress : ""}
            </div>
          </div>
        </div>
        <div className="right">
          <div className="balance_status">
            {typeof localizedTotalMainCurrencyAmount === "undefined" ? (
              <SharedLoadingSpinner size="small" />
            ) : (
              <div className="balance">${localizedTotalMainCurrencyAmount}</div>
            )}
            {isSelected ? (
              <div className="connected_status">
                {t("shared.accountItemSummary.connectedStatus")}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {children}

      <style jsx>{`
        .item-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          height: 52px;
          min-width: 0; // Allow collapsing if account name is too long.
        }
        .summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          flex-grow: 2;
          height: 52px;
          padding: 5px 0;
          overflow: hidden;
        }
        .avatar {
          background: url("${avatarURL ?? "./images/avatar@2x.png"}") center
            no-repeat;
          background-color: var(--green-40);
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
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
          padding-left: 4px;
          overflow: hidden;
        }
        .address_name {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .address {
          color: var(--green-40);
          font-size: 16px;
        }
        .balance {
          text-align: right;
          color: var(--green-40);
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
          margin: 0 5px 0 16px;
          overflow: hidden;
        }
        .right {
          display: flex;
          align-items: center;
          padding-right: 4px;
        }
      `}</style>
    </div>
  )
}

SharedAccountItemSummary.defaultProps = {
  isSelected: false,
}
