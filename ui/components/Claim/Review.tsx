import React, { ReactElement } from "react"
import AmountCombinedBanner from "./AmountCombinedBanner"

export default function Review(): ReactElement {
  return (
    <div className="claim standard_width">
      <div className="claim__title">Review claim</div>
      <div className="claim__description-review">You will receive</div>
      <AmountCombinedBanner />
      <div className="claim__description-review">Your delegate</div>

      <style jsx>
        {`
          .claim {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .claim__title {
            font-family: Quincy CF;
            font-size: 42px;
            line-height: 58px;
            margin-top: 12px;
          }
          .claim__description-review {
            font-family: Segment;
            font-size: 16px;
            line-height: 24px;
            margin-top: 24px;
            color: #99a8a7;
          }
        `}
      </style>
    </div>
  )
}
