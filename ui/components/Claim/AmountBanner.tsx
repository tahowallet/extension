import React, { ReactElement } from "react"

interface AmountBannerProps {
  step: number
}

export default function AmountBanner({
  step,
}: AmountBannerProps): ReactElement {
  return (
    <div className="banner__container">
      <div className="banner banner-primary">
        <div>
          <img className="banner__image" src="./images/claim.png" alt="" />
        </div>
        <div className="banner__claimable">
          <div className="banner__claimable__amount">10,989</div>
          <div className="banner__claimable__currency">TALLY</div>
        </div>
      </div>
      <div className={`banner__plus ${step === 1 && "banner__inactive"}`}>
        <img
          className="banner__plus__image"
          src="./images/plus@2x.png"
          alt=""
        />
      </div>
      <div
        className={`banner banner-secondary ${
          step === 1 && "banner__inactive"
        }`}
      >
        <div>Referral Bonus</div>
        <div className="banner__claimable">
          <div className="banner__claimable__amount">833</div>
          <div className="banner__claimable__currency">TALLY</div>
        </div>
      </div>
      <style jsx>
        {`
          .banner__container {
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
            padding: 0 24px;
          }
          .banner-primary {
            height: 96px;
            margin: 20px 0 8px 0;
            background-color: var(--hunter-green);
          }
          .banner-secondary {
            height: 56px;
            font-family: Segment;
            font-style: normal;
            font-weight: 500;
            color: #99a8a7;
            padding: 0 12px;
            background-color: #002522;
            margin-bottom: 8px;
            font-size: 14px;
            letter-spacing: 0.03em;
            transition: all 0.3s;
          }
          .banner__image {
            width: 90px;
            position: relative;
            top: -4px;
          }
          .banner__claimable__amount {
            font-family: Quincy CF;
            font-size: 36px;
            color: #22c480;
          }
          .banner__claimable__currency {
            color: #667c7a;
          }
          .banner__claimable {
            padding: 0 8px;
            text-align: right;
            display: flex;
            align-items: baseline;
            gap: 4px;
            font-size: 14px;
          }
          .banner__inactive {
            opacity: 0.5;
          }
          .banner__plus {
            width: 24px;
            height: 24px;
            background: #002522;
            align-self: flex-start;
            border-radius: 4px;
            border: 2px solid #193330;
            display: flex;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 105px;
            left: 38px;
            transition: all 0.3s;
          }
          .banner__plus__image {
            width: 12px;
            height: 12px;
            filter: grayscale(100%);
          }
        `}
      </style>
    </div>
  )
}
