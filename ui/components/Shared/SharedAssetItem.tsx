import React, { ReactElement, useEffect, useState } from "react"
import { AnyAsset, AnyAssetAmount } from "@tallyho/tally-background/assets"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { ROOTSTOCK } from "@tallyho/tally-background/constants"
import SharedAssetIcon from "./SharedAssetIcon"
import SharedIcon from "./SharedIcon"
import { blockExplorer } from "../../utils/constants"

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
  currentNetwork: EVMNetwork
  assetAndAmount: AnyAssetWithOptionalAmount<T>
  onClick?: (asset: T) => void
}

export default function SharedAssetItem<T extends AnyAsset>(
  props: Props<T>
): ReactElement {
  const { onClick, assetAndAmount, currentNetwork } = props
  const { asset } = assetAndAmount
  const [contractLink, setContractLink] = useState("")

  function handleClick() {
    onClick?.(asset)
  }

  useEffect(() => {
    const baseLink = blockExplorer[currentNetwork.chainID]?.url
    if ("contractAddress" in asset && baseLink) {
      const contractBase =
        currentNetwork.chainID === ROOTSTOCK.chainID ? "address" : "token"
      setContractLink(`${baseLink}/${contractBase}/${asset.contractAddress}`)
    } else {
      setContractLink("")
    }
  }, [asset, currentNetwork])

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
              <div
                className="symbol ellipsis"
                data-testid="asset_symbol"
                title={asset.symbol}
              >
                {asset.symbol}
              </div>
              <div className="token_subtitle ellipsis" title={asset.name}>
                {asset.name}
              </div>
            </div>
          </div>

          <div className="right_content">
            {hasAmounts(assetAndAmount) && (
              <div className="amount">
                {assetAndAmount.localizedDecimalAmount}
              </div>
            )}
            {contractLink && (
              <SharedIcon
                icon="icons/s/new-tab.svg"
                width={16}
                color="var(--green-40)"
                hoverColor="var(--trophy-gold)"
                onClick={() => {
                  window.open(contractLink, "_blank")?.focus()
                }}
              />
            )}
          </div>
        </div>
      </button>
      <style jsx>
        {`
          .left {
            display: flex;
            min-width: 0;
          }
          .list_item {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          .left_content {
            display: flex;
            flex-direction: column;
            height: 41px;
            justify-content: space-between;
            margin: 0 8px 0 16px;
            max-width: 100%;
            min-width: 0;
          }
          .right_content {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .amount {
            color: var(--green-40);
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
