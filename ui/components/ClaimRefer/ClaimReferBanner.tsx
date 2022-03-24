import React, { ReactElement } from "react"
import { Link } from "react-router-dom"

export default function ClaimReferBanner(): ReactElement {
  return (
    <div className="standard_width">
      <div className="banner">
        <div>
          <img className="image" src="./images/claim@2x.png" alt="" />
        </div>
        <div className="claimable">
          <div className="claimable_woohoo">Wohoo! You can claim</div>
          <div>
            <span className="claimable_amount">10,989</span> TALLY
          </div>
        </div>
        <Link to="/claim">
          <div className="button">{">"}</div>
        </Link>
      </div>

      <style jsx>
        {`
          .banner {
            height: 64px;
            width: 100%;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            padding: 0 16px;
            box-sizing: border-box;
            margin-bottom: 48px;
            justify-content: space-between;
            align-items: center;
          }
          .image {
            width: 72px;
            position: relative;
            top: -4px;
            left: -10px;
          }
          .claimable {
            display: flex;
            flex-flow: column;
            position: relative;
            top: 4px;
            left: -20px;
            color: var(--green-40);
            font-size: 14px;
          }
          .claimable_amount {
            font-family: Quincy CF;
            font-size: 36px;
            line-height: 38px;
            color: #22c480;
          }
          .button {
            width: 40px;
            height: 40px;
            background: #d08e39;
            border-radius: 8px;
            color: black;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
          }
        `}
      </style>
    </div>
  )
}
