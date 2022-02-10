import React, { ReactElement } from "react"
import { AnyAsset, AnyAssetAmount } from "@tallyho/tally-background/assets"
import SharedAssetIcon from "./SharedAssetIcon"

export type AnyAssetWithOptionalAmount<T extends AnyAsset> =
  | {
      asset: T
    }
  | {
      asset: T
      amount: bigint
      localizedDecimalAmount: string
    }

export function hasAmounts<T extends AnyAsset>(
  assetWithOptionalAmount: AnyAssetWithOptionalAmount<T>
): assetWithOptionalAmount is AnyAssetAmount<T> & {
  localizedDecimalAmount: string
} {
  // The types on AnyAssetWithOptionalAmount ensures that if amount exists, so
  // does localizedDecimalAmount.
  return "amount" in assetWithOptionalAmount
}

interface Props<T extends AnyAsset> {
  assetAndAmount: AnyAssetWithOptionalAmount<T>
  onClick?: (asset: T) => void
}

export default function SharedAssetItem<T extends AnyAsset>(
  props: Props<T>
): ReactElement {
  const { onClick, assetAndAmount } = props
  const { asset } = assetAndAmount

  function handleClick() {
    onClick?.(asset)
  }

  return (
    <li>
      <button type="button" className="token_group" onClick={handleClick}>
        <div className="list_item standard_width">
          <div className="left">
            <SharedAssetIcon
              logoURL={asset?.metadata?.logoURL}
              symbol={asset?.symbol}
            />

            <div className="left_content">
              <div className="symbol">{asset.symbol}</div>
              <div className="token_subtitle">{asset.name}</div>
            </div>
          </div>

          {hasAmounts(assetAndAmount) ? (
            <div className="amount">
              {assetAndAmount.localizedDecimalAmount}
            </div>
          ) : (
            <></>
          )}
        </div>
      </button>
      <style jsx>
        {`
          .left {
            display: flex;
          }
          .list_item {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          .left_content {
            display: flex;
            flex-direction: column;
            height: 41px;
            justify-content: space-between;
            margin-left: 16px;
          }
          .token_group {
            display: flex;
            align-items: center;
            box-sizing: border-box;
            width: 100%;
            padding: 7.5px 24px;
          }
          .token_group:hover {
            background-color: var(--hunter-green);
          }
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 46px;
            background-color: var(--hunter-green);
            border-radius: 80px;
            margin-right: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .token_group:hover .token_icon_wrap {
            background-color: var(--green-120);
          }
          .token_subtitle {
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-top: 5px;
          }
          .icon_eth {
            background: url("./images/eth@2x.png");
            background-size: 18px 29px;
            width: 18px;
            height: 29px;
          }
          .symbol {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 18px;
            text-transform: uppercase;
            margin-top: 2px;
          }
        `}
      </style>
    </li>
  )
}
