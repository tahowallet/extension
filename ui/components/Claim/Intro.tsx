import React, { ReactElement } from "react"
import AmountBanner from "./AmountBanner"

export default function Intro(): ReactElement {
  return (
    <div className="claim standard_width">
      <AmountBanner step={1} />
      <div className="claim__title">Claim Tally</div>
      <div className="claim__description">
        Tally is an open source wallet that is run by the community and token
        holders.
      </div>
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
          .claim__description {
            font-family: Segment;
            font-size: 16px;
            line-height: 24px;
            color: #99a8a7;
          }
        `}
      </style>
    </div>
  )
}
