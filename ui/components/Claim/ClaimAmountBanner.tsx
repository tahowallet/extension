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
          <img src="./images/claim@2x.png" alt="" />
        </div>
        <div className="claimable">
          <div className="claimable_amount">{amount}</div>
          <div className="claimable_currency symbol">TALLY</div>
        </div>
      </div>
      <style jsx>
        {`
          .banner {
            width: 100%;
            border-radius: 12px;
            display: flex;
            padding: 0 4px;
            box-sizing: border-box;
            align-items: center;
            padding: 0 17px;
            height: 66px;
            margin: 20px 0 8px 0;
            background-color: var(--hunter-green);
            justify-content: space-between;
          }
          img {
            width: 89px;
            height: 69.9px;
            margin-left: -3px;
          }
          .claimable_amount {
            font-family: Quincy CF;
            font-size: 36px;
            color: var(--success);
            margin-left: 5px;
            line-height: 27px;
            display: inline-block;
          }
          .claimable_currency {
            color: var(--green-40);
          }
          .claimable {
            display: flex;
            align-items: flex-end;
          }
          .symbol {
            color: var(--green-40);
            margin-left: 8px;
            display: inline-block;
          }
        `}
      </style>
    </div>
  )
}
