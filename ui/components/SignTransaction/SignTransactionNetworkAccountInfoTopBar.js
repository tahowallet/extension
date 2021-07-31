import React from "react"

export default function SignTransactionNetworkAccountInfoTopBar() {
  return (
    <div className="top_bar_wrap">
      <div className="row_part">
        <div className="network_icon" />
        <span className="network_name">Arbitrum</span>
      </div>
      <div className="row_part">
        <span className="account_name">Foxhunter</span>
        <div className="account_avatar" />
      </div>
      <style jsx>
        {`
          .top_bar_wrap {
            margin: 0 auto;
            margin-top: 16px;
            margin-bottom: 16px;
            width: 352px;
            display: flex;
            justify-content: space-between;
          }
          .network_name {
            color: var(--green-20);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-left: 5px;
          }
          .account_name {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: right;
          }
          .row_part {
            display: flex;
            align-items: center;
          }
          .account_avatar {
            border-radius: 2px;
            width: 24px;
            height: 24px;
            background-color: white;
            margin-left: 8px;
            background: url("./images/portrait.png");
            background-size: cover;
          }
          .network_icon {
            background: url("./images/arbitrum_icon_small@2x.png");
            background-size: cover;
            width: 15px;
            height: 16px;
          }
        `}
      </style>
    </div>
  )
}
