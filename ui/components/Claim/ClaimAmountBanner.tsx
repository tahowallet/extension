import classNames from "classnames"
import React, { ReactElement } from "react"

export default function ClaimAmountBanner({
  amount,
  showLabel = false,
  showBonus = false,
}: {
  amount: number
  showLabel?: boolean
  showBonus?: boolean
}): ReactElement {
  return (
    <div className="wrap">
      <div className="banner">
        <div>
          <img src="./images/claim@2x.png" alt="" />
        </div>
        <div
          className={classNames("claimable", {
            column: showLabel,
          })}
        >
          {showLabel && (
            <div className="claimable_text">
              Your claim{showBonus ? " + Bonus" : ""}
            </div>
          )}
          <div className="claimable_amount">{amount}</div>
          <div className="claimable_text symbol">DOGGO</div>
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
          .claimable_text {
            color: var(--green-40);
            font-size: 14px;
          }
          .claimable {
            display: flex;
            align-items: flex-end;
          }
          .claimable.column {
            flex-direction: column;
            align-items: center;
            margin-right: 20px;
            padding: 5px 0;
          }
          .claimable.column .claimable_text {
            margin: 5px 0;
          }
          .symbol {
            margin-left: 8px;
            display: inline-block;
            font-size: 16px;
          }
        `}
      </style>
    </div>
  )
}
