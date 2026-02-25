import React, { ReactElement } from "react"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"
import SharedTwitterButton from "../Shared/SharedTwitterButton"
import { useBackgroundSelector } from "../../hooks"

export default function ClaimSuccessModalContent({
  close,
}: {
  close: () => void
}): ReactElement {
  const currentAccount = useBackgroundSelector(selectCurrentAccount)

  return (
    <div className="wrap">
      <div className="header_image" />
      <div className="header_transaction">Transaction submitted</div>
      <h1>Share 5% bonus link</h1>
      <div className="subtitle">
        {`Each time someone uses your bonus link, you'll get 5% of all the DOGGO
        they claim.`}
      </div>
      <SharedTwitterButton
        buttonLabel="Share on twitter"
        link={`${WEBSITE_ORIGIN}/claim/${currentAccount.address}`}
        text="Get an extra 5% bonus on your $DOGGO claim when you use this link (🐶, 🐶)"
        onClick={close}
      />
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
            background:
              url("./images/claim_success.png"), url("./images/dark_forest_bg@2x.png");
            background-repeat: no-repeat;
            background-size: cover;
            background-position: top;
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
