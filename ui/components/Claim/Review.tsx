import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"
import AmountBanner from "./AmountBanner"

export default function Review(): ReactElement {
  return (
    <div className="claim standard_width">
      <div className="title">Review claim</div>
      <div className="description_review">You will receive</div>
      <AmountBanner />
      <div className="description_review">Refered by</div>
      <div className="content">
        <div className="icon" />
        OlympusDAO
      </div>
      <div className="description_review">Chosen delegate</div>
      <div className="content">
        <div className="icon" />
        <div className="option">
          <div className="left">
            Justin Sun
            <div className="address">0x328d...8hsf</div>
          </div>
          <div className="right">
            <SharedButton type="tertiaryGray" size="small">
              Change
            </SharedButton>
          </div>
        </div>
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
            font-size: 42px;
            line-height: 58px;
            margin-top: 12px;
          }
          .description_review {
            font-size: 16px;
            line-height: 24px;
            margin-top: 14px;
            color: var(--green-40);
          }
          .content {
            width: 352px;
            height: 64px;
            border-radius: 8px;
            background-color: var(--hunter-green);
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
          .address {
            width: 102px;
            height: 24px;
            color: var(--green-60);
            font-size: 16px;
            line-height: 24px;
            text-align: left;
          }
          .option {
            display: flex;
            justify-content: space-between;
            width: inherit;
            align-items: center;
          }
          .left {
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </div>
  )
}
