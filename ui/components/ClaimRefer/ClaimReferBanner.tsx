import React, { ReactElement } from "react"

export default function ClaimReferBanner(): ReactElement {
  return (
    <div className="standard_width">
      <div className="banner">
        <div>
          <img className="banner__image" src="./images/claim.png" alt="" />
        </div>
        <div className="banner__claimable">
          <div className="banner__claimable__woohoo">Wohoo! You can claim</div>
          <div>10 Tally</div>
        </div>
        <div>Button</div>
      </div>

      <style jsx>
        {`
          .banner {
            height: 64px;
            width: 100%;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 48px;
            justify-content: space-between;
            align-items: center;
          }
          .banner__image {
            width: 80px;
          }
          .banner__claimable {
            display: flex;
            flex-flow: column;
          }
          .banner__claimable__woohoo {
            color: var(--green-40);
            font-size: 14px;
          }
        `}
      </style>
    </div>
  )
}
