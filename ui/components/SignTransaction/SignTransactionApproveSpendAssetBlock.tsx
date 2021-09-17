import React, { ReactElement } from "react"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedButton from "../Shared/SharedButton"

export default function SignTransactionApproveSpendAssetBlock(): ReactElement {
  return (
    <>
      <div className="spend_destination_icons">
        <div className="site_icon" />
        <div className="asset_icon_wrap">
          <SharedAssetIcon size="large" />
        </div>
      </div>
      <span className="site">Uniswap</span>
      <span className="spending_label">Spend KEEP tokens</span>
      <span className="speed_limit_label">Spend limit</span>
      <span className="spend_amount">422,391,328.23 KEEP</span>
      <SharedButton size="small" type="tertiary">
        Change limit
      </SharedButton>
      <div className="spacer" />
      <style jsx>
        {`
          .site_icon {
            background: url("./images/uniswap_large@2x.png");
            background-size: cover;
            width: 48px;
            height: 48px;
            margin-right: -16px;
          }
          .spend_destination_icons {
            display: flex;
            margin-top: 22px;
            margin-bottom: 16px;
          }
          .asset_icon_wrap {
            z-index: 1;
          }
          .site {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: center;
          }
          .spending_label {
            width: 272px;
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            text-align: center;
            border-bottom: 1px solid var(--green-120);
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .speed_limit_label {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            margin-bottom: 4px;
          }
          .spend_amount {
            color: #fff;
            font-size: 16px;
            line-height: 24px;
            text-align: right;
            text-transform: uppercase;
          }
          .spacer {
            margin-bottom: 18px;
          }
        `}
      </style>
    </>
  )
}
