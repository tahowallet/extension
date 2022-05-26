import React, { ReactElement } from "react"

export default function ClaimAmountCombinedBanner(): ReactElement {
  return (
    <div className="banner banner_primary">
      <div>
        <img className="banner_image" src="./images/claim@2x.png" alt="" />
      </div>
      <div className="claimable">
        <div className="title">Claim + Bonus</div>
        <div className="amount">10,989</div>
        <div className="currency">DOGGO</div>
      </div>
      <style jsx>
        {`
          .banner {
            width: 100%;
            border-radius: 12px;
            display: flex;
            padding: 0 4px;
            box-sizing: border-box;
            justify-content: space-between;
            align-items: center;
            padding: 0 24px;
          }
          .banner_primary {
            height: 106px;
            margin-top: 20px;
            background-color: var(--hunter-green);
            transition: height 0.2s;
            opacity: 1;
          }
          .banner_image {
            width: 100px;
          }
          .claimable {
            display: flex;
            align-items: center;
            flex-flow: column;
            gap: 4px;
            font-size: 14px;
            padding-right: 32px;
          }
          .title {
            color: #99a8a7;
            font-size: 14px;
          }
          .amount {
            font-family: Quincy CF;
            font-size: 36px;
            color: #22c480;
          }
          .currency {
            color: var(--green-60);
          }
        `}
      </style>
    </div>
  )
}
