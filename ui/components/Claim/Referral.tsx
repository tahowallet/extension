import React, { ReactElement, useState } from "react"
import SharedInput from "../Shared/SharedInput"
import AmountBanner from "./AmountBanner"

export default function Referral(): ReactElement {
  const [referrCode, setReferrCode] = useState("")
  return (
    <div className="claim standard_width">
      <AmountBanner step={2} />
      <div className="claim__title">Reffer a friend</div>
      <div className="claim__description">
        Do you have a referral code? Referral codes come in the shape of an
        ethereum address.
      </div>
      <div>
        <label htmlFor="referInput">Refferal code</label>
        <input className="refer__input" />
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
          .refer{
            position: relative;
            margin-top 24px;
          }
          .refer__input{
            border: 2px solid white;
            color: black;
          }
          .refer__code {
            font-size: 12px;
            color: #99a8a7;
            position: absolute;
            background-color: #193330;
            padding: 0 6px;
            top: -8px;
            left: 12px;
          }
        `}
      </style>
    </div>
  )
}
