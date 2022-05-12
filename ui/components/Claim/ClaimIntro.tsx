import React, { ReactElement } from "react"
import ClaimAmountBanner from "./ClaimAmountBanner"
import ClaimReferralBridge from "./ClaimReferralBridge"

export default function ClaimIntro(props: {
  claimAmount: number
}): ReactElement {
  const { claimAmount } = props

  return (
    <div className="claim standard_width">
      <ClaimReferralBridge />
      <div className="title">You’re about to claim</div>
      <ClaimAmountBanner amount={claimAmount} />
      <p className="list_title">Here are your next steps:</p>
      <div className="content">
        <ul>
          <li>
            <div className="circle">1</div>
            <div className="info">
              Get bonus<p>Receive 5% extra from your claim.</p>
            </div>
          </li>
          <li>
            <div className="circle">2</div>
            <div className="info">
              Read Manifesto<p>Learn how and why we came to be.</p>
            </div>
          </li>
          <li>
            <div className="circle">3</div>
            <div className="info">
              Choose delegate<p>Select DAO representative.</p>
            </div>
          </li>
        </ul>
      </div>
      <style jsx>
        {`
          .claim {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .title {
            font-family: Quincy CF;
            font-size: 36px;
            line-height: 58px;
            margin-top: 10px;
            text-align: center;
            margin-bottom: -7px;
          }
          .circle {
            width: 32px;
            height: 32px;
            border-radius: 42px;
            border: 1px solid var(--green-60);
            background-color: var(--hunter-green);
            text-align: center;
            line-height: 32px;
            color: var(--green-60);
            font-size: 18px;
            font-weight: 600;
          }
          .content {
            display: flex;
          }
          ul {
            display: flex;
            flex-direction: column;
          }
          li {
            display: flex;
            color: var(--green-5);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            margin-bottom: 30px;
          }
          .info {
            margin-left: 16px;
          }
          p {
            width: 292px;
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            padding: 0;
            margin: 0;
          }
          .list_title {
            margin-bottom: 25px;
            margin-top: 20px;
          }
        `}
      </style>
    </div>
  )
}
