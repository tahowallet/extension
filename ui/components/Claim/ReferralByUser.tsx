import React, { ReactElement } from "react"
import AmountBanner from "./AmountBanner"

export default function ReferralByUser(): ReactElement {
  return (
    <div className="wrap standard_width">
      <AmountBanner />
      <div className="title">
        Get a bonus of <div className="highlight">463</div> TALLY!
      </div>
      <div className="description">
        You were refered by somebody, and to reward that you each get 463 TALLY
      </div>
      <div className="label">Refered by</div>
      <div className="ref_block">
        <div className="icon" />
        henryboldi.eth
      </div>
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
            margin-top: 40px;
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
          .label {
            font-size: 16px;
            line-height: 24px;
            margin-top: 14px;
            color: var(--green-40);
            margin-bottom: 10px;
          }
          .ref_block {
            width: 352px;
            height: 64px;
            border-radius: 8px;
            background-color: var(--green-95);
            padding: 12px 16px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
          }
          .icon {
            width: 40px;
            height: 40px;
            border-radius: 150px;
            background-color: #006ae3;
            margin-right: 13px;
            flex-shrink: 0;
          }
        `}
      </style>
    </div>
  )
}
