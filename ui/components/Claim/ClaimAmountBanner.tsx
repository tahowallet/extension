import React, { ReactElement } from "react"

export default function ClaimAmountBanner({
  amount,
}: {
  amount: number
}): ReactElement {
  return (
    <div className="wrap">
      <div className="banner">
        <div>
          <img src="./images/claim.png" alt="" />
        </div>
        <div className="claimable">
          <div className="claimable_currency">Claiming</div>
          <div className="claimable_amount">{amount}</div>
          <div className="claimable_currency symbol">TALLY</div>
        </div>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 100%;
            transition: all 0.3s;
            position: relative;
          }
          .banner {
            width: 100%;
            border-radius: 12px;
            display: flex;
            padding: 0 4px;
            box-sizing: border-box;
            justify-content: space-between;
            align-items: center;
            padding: 0 17px;
            height: 66px;
            margin: 20px 0 8px 0;
            background-color: var(--hunter-green);
          }
          img {
            width: 90px;
            position: relative;
            top: -4px;
          }
          .claimable_amount {
            font-family: Quincy CF;
            font-size: 36px;
            color: var(--success);
            margin-left: 5px;
          }
          .claimable_currency {
            color: var(--green-40);
          }
          .claimable {
            padding: 0 8px;
            text-align: right;
            display: flex;
            align-items: baseline;
            gap: 4px;
            font-size: 14px;
          }
          .symbol {
            color: var(--success);
          }
        `}
      </style>
    </div>
  )
}
