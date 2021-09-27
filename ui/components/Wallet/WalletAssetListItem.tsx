// @ts-check
//
import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { convertToEth } from "@tallyho/tally-background/lib/utils"

import SharedAssetIcon from "../Shared/SharedAssetIcon"

interface Props {
  assetAmount: {
    localizedDecimalValue?: string
    balance?: number
    localizedUserValue?: string
    asset?: {
      symbol?: string
      metadata?: {
        logoURL?: string
      }
    }
  }
}

export default function WalletAssetListItem(props: Props): ReactElement {
  const { assetAmount } = props

  // TODO: ETH price hard-coded for demo
  return (
    <li>
      <Link to="/singleAsset">
        <div className="list_item standard_width">
          <div className="left">
            {assetAmount?.asset?.metadata?.logoURL ? (
              <img
                width="40px"
                src={assetAmount?.asset?.metadata?.logoURL}
                alt=""
              />
            ) : (
              <SharedAssetIcon />
            )}

            <div className="left_content">
              <div className="amount">
                <span className="bold_amount_count">
                  {assetAmount.localizedDecimalValue}
                </span>
                {assetAmount.asset.symbol}
              </div>
              <div className="price">${assetAmount.localizedUserValue}</div>
            </div>
          </div>
          <div className="right">
            <span className="icon_send_asset" />
            <span className="icon_swap_asset" />
          </div>
        </div>
      </Link>
      <style jsx>
        {`
          .list_item {
            height: 72px;
            border-radius: 16px;
            background-color: var(--green-95);
            display: flex;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 16px;
            justify-content: space-between;
            align-items: center;
          }
          .list_item:hover {
            background-color: var(--green-80);
          }
          .left {
            display: flex;
          }
          .left_content {
            display: flex;
            flex-direction: column;
            height: 41px;
            justify-content: space-between;
            margin-left: 16px;
          }
          .amount {
            height: 17px;
            color: #fefefc;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-transform: uppercase;
          }
          .bold_amount_count {
            width: 70px;
            height: 24px;
            color: #fefefc;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-right: 4px;
          }
          .price {
            width: 58px;
            height: 17px;
            color: var(--green-40);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .icon_send_asset {
            background: url("./images/send_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .icon_swap_asset {
            background: url("./images/swap_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .right {
            display: flex;
            width: 48px;
            justify-content: space-between;
            margin-right: 16px;
          }
        `}
      </style>
    </li>
  )
}
