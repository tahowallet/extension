import React, { ReactElement } from "react"
import ClaimAmountBanner from "./ClaimAmountBanner"

export default function ClaimManifesto({
  claimAmount,
}: {
  claimAmount: number
}): ReactElement {
  return (
    <div className="standard_width">
      <ClaimAmountBanner amount={claimAmount} showLabel showBonus />
      <ul>
        <li>
          <div className="ethos_title">Our community&apos;s values</div>
          <div className="description">
            Before claiming your $DOGGO, take a moment to review our
            community&apos;s values.
          </div>
        </li>
        <li>
          <div className="ethos_title">Access over privilege</div>
          <div className="description">
            Everyone should have access to web3—regardless of where they live or
            which country issued their passport.
          </div>
        </li>
        <li>
          <div className="ethos_title">
            Open source over restrictive licensing
          </div>
          <div className="description">
            All Taho code is—and will remain—100% free and open source. For
            anyone to review, fork, hack, or remix.
          </div>
        </li>
        <li>
          <div className="ethos_title">
            Community control over centralized profiteering
          </div>
          <div className="description">
            This protocol is owned and operated by a community of $DOGGO holders
            just like you.
          </div>
        </li>
      </ul>
      <style jsx>
        {`
          .ethos_title {
            font-weight: 500;
            font-size: 18px;
            line-height: 28px;
            margin-bottom: 4px;
          }
          .description {
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
          }
          li {
            display: flex;
            flex-direction: column;
            margin-bottom: 20px;
          }
          ul {
            display: flex;
            flex-direction: column;
            margin-top: 40px;
          }
          li:first-of-type .ethos_title {
            font-size: 22px;
          }
        `}
      </style>
    </div>
  )
}
