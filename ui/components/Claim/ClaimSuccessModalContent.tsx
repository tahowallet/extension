import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"

export default function ClaimSuccessModalContent(): ReactElement {
  return (
    <div className="wrap">
      <div className="header_image" />
      <h1>Congratulations & welcome to the pack!</h1>
      <div className="subtitle">
        While your transaction is beeing processed, let’s share your bonus
        address and the good news with the world! Each time someone uses your
        code, you&apos;ll get 5% of all the DOGGO they claim.
      </div>
      <SharedButton type="primary" size="medium">
        Share on twitter
      </SharedButton>
      <style jsx>
        {`
          .wrap {
            width: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h1 {
            width: 325px;
            height: 78px;
            color: #fff;
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            text-align: center;
            font-family: Quincy CF;
          }
          .subtitle {
            width: 321px;
            height: 118px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
            margin-bottom: 34px;
          }
          .header_image {
            background: url("./images/congrats_header@2x.png");
            background-size: cover;
            width: 384px;
            height: 222px;
            margin-top: -38px;
          }
        `}
      </style>
    </div>
  )
}
