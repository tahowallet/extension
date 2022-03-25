import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import ClaimAmountBanner from "./ClaimAmountBanner"
import ClaimDelegateChoiceProfile from "./ClaimDelegateChoiceProfile"
import ClaimReferralBridge from "./ClaimReferralBridge"

export default function ClaimReferralByUser({
  claimAmount,
}: {
  claimAmount: number
}): ReactElement {
  const amountWithBonus = formatCurrencyAmount("USD", claimAmount * 0.05, 2)
  const referrer = useBackgroundSelector((state) => state.claim.referrer)

  return (
    <div className="wrap standard_width">
      <ClaimAmountBanner amount={claimAmount} />
      <div className="title">
        Get a bonus of
        <div className="highlight">{amountWithBonus}</div> TALLY!
      </div>
      <div className="description">
        {`You were referred by somebody, and to reward that you each get ${amountWithBonus} TALLY`}
      </div>
      <ClaimReferralBridge />
      <ClaimDelegateChoiceProfile name={referrer ?? "henryboldi.eth"} />
      <style jsx>
        {`
          .wrap {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .title {
            height: 32px;
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            display: flex;
            align-items: center;
            margin-top: 25px;
            margin-bottom: 11px;
          }
          .description {
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
            margin-bottom: 15px;
          }
          .highlight {
            color: var(--success);
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            font-family: Quincy CF;
            margin: 0px 8px;
          }
        `}
      </style>
    </div>
  )
}
