import React, { ReactElement } from "react"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

export default function ClaimSuccessModalContent({
  close,
}: {
  close: () => void
}): ReactElement {
  return (
    <div className="wrap">
      <div className="header_image" />
      <div className="header_transaction">Transaction submited</div>
      <h1>Share 5% bonus link</h1>
      <div className="subtitle">
        {`Each time someone uses your bonus link, you'll get 5% of all the DOGGO
        they claim.`}
      </div>
      <SharedButton
        type="twitter"
        size="medium"
        iconPosition="left"
        iconSize="secondaryMedium"
      >
        Share on twitter
      </SharedButton>
      <div className="notice">
        <SharedIcon icon="eye@2x.png" width={24} color="var(--trophy-gold)" />
        <span className="notice_text">Address will be visible in the link</span>
      </div>
      <SharedButton onClick={close} type="tertiaryGray" size="small">
        Don&apos;t share now
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
            color: #fff;
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            text-align: center;
            font-family: Quincy CF;
            margin: 0;
          }
          .subtitle {
            width: 321px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
            margin: 8px 0 32px;
          }
          .header_image {
            background: url("./images/claim_success.svg"),
              url("./images/dark_forest@2x.png");
            background-repeat: no-repeat;
            background-position: top, 0 40px;
            background-color: var(--green-95);
            width: 100%;
            height: 240px;
            margin-top: -38px;
          }
          .header_transaction {
            color: var(--attention);
            font-size: 22px;
            margin-bottom: 22px;
          }
          .notice {
            width: 352px;
            height: 40px;
            border-radius: 8px;
            background-color: var(--green-120);
            display: flex;
            align-items: center;
            padding: 12px;
            box-sizing: border-box;
            margin: 35px 0 22px;
          }
          .notice_text {
            margin-left: 10px;
          }
        `}
      </style>
    </div>
  )
}
