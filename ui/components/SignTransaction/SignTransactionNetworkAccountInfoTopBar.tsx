import React, { ReactElement } from "react"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"

type Props = {
  accountTotal: AccountTotal
}

export default function SignTransactionNetworkAccountInfoTopBar({
  accountTotal,
}: Props): ReactElement {
  if (typeof accountTotal === "undefined") {
    return <></>
  }

  const { shortenedAddress, name, avatarURL } = accountTotal

  return (
    <div className="top_bar_wrap standard_width">
      <div className="row_part">
        <div className="network_icon" />
        <span className="network_name">Arbitrum</span>
      </div>
      <div className="row_part">
        <SharedCurrentAccountInformation
          shortenedAddress={shortenedAddress}
          name={name}
          avatarURL={avatarURL}
        />
      </div>
      <style jsx>
        {`
          .top_bar_wrap {
            margin: 0 auto;
            margin-top: 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
          }
          .network_name {
            color: var(--green-20);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-left: 5px;
            opacity: 0;
          }
          .account_name {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: right;
          }
          .row_part {
            display: flex;
            align-items: center;
          }
          .account_avatar {
            border-radius: 2px;
            width: 24px;
            height: 24px;
            background-color: white;
            margin-left: 8px;
            background: url("./images/portrait.png");
            background-size: cover;
          }
          .network_icon {
            background: url("./images/arbitrum_icon_small@2x.png");
            background-size: cover;
            width: 15px;
            height: 16px;
            opacity: 0;
          }
        `}
      </style>
    </div>
  )
}
