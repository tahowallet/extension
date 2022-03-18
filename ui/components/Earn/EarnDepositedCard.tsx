import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { AnyAsset } from "@tallyho/tally-background/assets"
import { HexString } from "@tallyho/tally-background/types"
import SharedAssetIcon from "../Shared/SharedAssetIcon"

export default function EarnDepositedCard({
  asset,
  depositedAmount,
  availableRewards,
}: {
  asset: (AnyAsset & { contractAddress: HexString }) | undefined
  depositedAmount: number
  availableRewards: number
}): ReactElement {
  return (
    <Link
      to={{
        pathname: "/earn/deposit",
        state: {
          asset,
        },
      }}
      className="earn"
    >
      <div className="card">
        <div className="token_meta">
          <div className="asset_icon_wrap">
            <SharedAssetIcon size="medium" symbol={asset?.symbol} />
          </div>
          <span className="token_name">{asset?.symbol}</span>
        </div>
        <li className="info">
          <span className="amount_type">Estimated APR</span>
          <span className="amount">250%</span>
        </li>
        <li className="info">
          <span className="amount_type">Deposited amount</span>
          <span className="amount">{depositedAmount}</span>
        </li>
        <li className="info">
          <span className="amount_type">Available rewards</span>
          <span className="amount">{availableRewards}</span>
        </li>
        <style jsx>{`
          .card {
            width: 352px;
            height: 176px;
            border-radius: 8px;
            background-color: var(--green-95);
            box-sizing: border-box;
            padding: 16px;
            margin-bottom: 20px;
            margin-top: 30px;
          }
          .card:hover {
            box-shadow: 0px 10px 12px 0px #0014138a;
            background: linear-gradient(
              180deg,
              #284340 0%,
              var(--green-95) 100%
            );
          }
          .info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 8px;
          }
          .amount {
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .amount_type {
            color: var(--green-40);
            font-size: 14px;
            font-weight: 500;
            line-height: 16px;
            text-align: right;
          }
          .token_meta {
            display: flex;
            flex-direction: column;
          }
          .token_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            margin-bottom: 10px;
          }
          .asset_icon_wrap {
            display: flex;
            justify-content: center;
            margin-bottom: 10px;
            margin-top: -40px;
          }
        `}</style>
      </div>
    </Link>
  )
}
