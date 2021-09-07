import React, { ReactElement } from "react"

interface Props {
  isSelected: boolean
}

export default function AccountsNotificationPanelAccountItem(
  props: Props
): ReactElement {
  const { isSelected } = props

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
          <div className="address_name">Foxrunner</div>
          <div className="address">0x3cd…xg23</div>
        </div>
      </div>
      <div className="right">
        <div className="balance_status">
          <div className="balance">
            <span className="lighter">$</span>4,124.23
          </div>
          {isSelected ? (
            <div className="connected_status">Connected</div>
          ) : null}
        </div>
        <div className="icon_settings" />
      </div>
      <style jsx>{`
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          margin-bottom: 16px;
          height: 52px;
        }
        .avatar {
          background: url("./images/avatar@2x.png") center no-repeat;
          background-size: cover;
          width: 48px;
          height: 48px;
        }
        .avatar_selected_outline {
          width: 52px;
          height: 52px;
          border-radius: 14px;
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
          color: #99a8a7;
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
