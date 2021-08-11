import React from "react"

export default function AccountsNotificationPanelAccountItem() {
  return (
    <li>
      <div className="left">
        <div className="avatar" />
        <div className="info">
          <div className="address_name">Foxrunner</div>
          <div className="address">0x3cd…xg23</div>
        </div>
      </div>
      <div className="right">
        <div className="balance">$4,124.23</div>
        <div className="connected_status">Connected</div>
      </div>
      <style jsx>{`
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
      `}</style>
    </li>
  )
}
