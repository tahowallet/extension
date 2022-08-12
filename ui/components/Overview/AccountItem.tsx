import React, { ReactElement } from "react"

export default function AccountItem(): ReactElement {
  return (
    <>
      <div className="account_item">
        <span className="account_value account_name">xyz.eth</span>
        <span className="account_value">10%</span>
        <span className="account_value">$1,324,231.00</span>
      </div>
      <style jsx>{`
        .account_item {
          background: var(--green-95);
          border-radius: 2px;
          color: var(--green-20);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          align: right;
          margin-top: 8px;
          padding: 2px 6px;
          display: flex;
        }
        .account_value {
          display: block;
          text-align: right;
        }
        .account_value:nth-child(1) {
          width: 45%;
        }
        .account_value:nth-child(2) {
          width: 15%;
        }
        .account_value:nth-child(3) {
          width: 40%;
          padding-left: 10px;
        }
        .account_name {
          text-align: left;
          color: var(--green-40);
        }
      `}</style>
    </>
  )
}
