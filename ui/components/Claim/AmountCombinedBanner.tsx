import React, { ReactElement } from "react"

export default function AmountCombinedBanner(): ReactElement {
  return (
    <div className="banner banner-primary-combined">
      <div>
        <img
          className="banner__image-combined"
          src="./images/claim.png"
          alt=""
        />
      </div>
      <div className="banner__claimable-combined">
        <div className="banner_claimable__title">Claim + Bonus</div>
        <div className="banner__claimable__amount">10,989</div>
        <div className="banner__claimable__currency">TALLY</div>
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
          .banner-primary-combined {
            height: 106px;
            margin-top: 20px;
            background-color: var(--hunter-green);
            transition: height 0.2s;
            opacity: 1;
          }
          .banner__image-combined {
            width: 100px;
          }
          .banner__claimable-combined {
            display: flex;
            align-items: center;
            flex-flow: column;
            gap: 4px;
            font-size: 14px;
            padding-right: 32px;
          }
          .banner_claimable__title {
            color: #99a8a7;
            font-size: 14px;
          }
          .banner__claimable__amount {
            font-family: Quincy CF;
            font-size: 36px;
            color: #22c480;
          }
          .banner__claimable__currency {
            color: var(--green-60);
          }
        `}
      </style>
    </div>
  )
}
