import { AssetSwap } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  getAssetsState,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"
import SharedAssetIcon from "../../../../Shared/SharedAssetIcon"
import { useBackgroundSelector } from "../../../../../hooks"
import SigningDataTransactionSummaryBody from "./TransactionSignatureSummaryBody"
import SharedAddress from "../../../../Shared/SharedAddress"

export default function SwapAssetSummary({
  annotation: { fromAssetAmount, toAssetAmount, swapContractInfo },
  transactionRequest: { to },
}: TransactionSignatureSummaryProps<AssetSwap>): ReactElement {
  const assets = useBackgroundSelector(getAssetsState)

  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const fromAssetPricePoint = selectAssetPricePoint(
    assets,
    fromAssetAmount.asset.symbol,
    mainCurrencySymbol
  )
  const localizedFromMainCurrencyAmount =
    enrichAssetAmountWithMainCurrencyValues(
      fromAssetAmount,
      fromAssetPricePoint,
      2
    ).localizedMainCurrencyAmount ?? "-"

  return (
    <>
      <h1 className="serif_header title">Swap assets</h1>
      <SigningDataTransactionSummaryBody>
        <span className="site">
          {swapContractInfo !== undefined ? (
            <SharedAddress
              address={swapContractInfo.address}
              name={
                swapContractInfo.annotation?.nameRecord?.resolved?.nameOnNetwork
                  ?.name
              }
            />
          ) : (
            <SharedAddress address={to ?? "-"} />
          )}
        </span>
        <span className="pre_post_label">Spend amount</span>
        <span className="spend_amount">
          {fromAssetAmount.localizedDecimalAmount}{" "}
          {fromAssetAmount.asset.symbol}
        </span>
        <span className="pre_post_label">
          {localizedFromMainCurrencyAmount}
        </span>
        <div className="asset_items_wrap">
          <div className="asset_item">
            <SharedAssetIcon
              size="small"
              symbol={fromAssetAmount.asset.symbol}
              logoURL={fromAssetAmount.asset.metadata?.logoURL}
            />
            <span className="asset_name">{fromAssetAmount.asset.symbol}</span>
          </div>
          <div className="icon_switch" />
          <div className="asset_item">
            <span className="asset_name">{toAssetAmount.asset.symbol}</span>
            <SharedAssetIcon
              size="small"
              symbol={toAssetAmount.asset.symbol}
              logoURL={toAssetAmount.asset.metadata?.logoURL}
            />
          </div>
        </div>
      </SigningDataTransactionSummaryBody>
      <style jsx>{`
            .title {
              color: var(--trophy-gold);
              font-size: 36px;
              font-weight: 500;
              line-height: 42px;
              text-align: center;
            }
            .site {
              color: #fff;
              font-size: 16px;
              font-weight: 500;
              line-height: 24px;
              text-align: center;
              padding: 15px 0px;
              border-bottom: 1px solid var(--green-120);
              width: 272px;
              margin-bottom: 15px;
            }
            .pre_post_label {
              color: var(--green-40);
              font-size: 16px
              line-height: 24px;
              text-align: center;
            }
            .amount {
              color: #fff;
              font-size: 28px;
              font-weight: 500;
              line-height: 30px;
              text-align: center;
              text-transform: uppercase;
              margin-top: 3px;
            }
            .asset_name {
              color: var(--green-20);
              font-size: 14px;
              line-height: 16px;
              text-align: right;
              text-transform: uppercase;
              margin: 0px 8px;
            }
            .asset_items_wrap {
              display: flex;
              margin-top: 14px;
              margin-bottom: 16px;
            }
            .asset_item:nth-of-type(3) {
              justify-content: flex-end;
            }
            .icon_switch {
              background: url('./images/swap_asset.svg') center no-repeat;
              background-size: 12px 12px;
              width: 24px;
              height: 24px;
              border-radius: 6px;
              border: 3px solid var(--hunter-green);
              background-color: var(--green-95);
              margin-left: -11px;
              margin-right: -11px;
              z-index: 5;
              flex-grow: 1;
              flex-shrink: 0;
              margin-top: 9px;
            }
            .asset_item {
              width: 108px;
              height: 48px;
              border-radius: 4px;
              background-color: var(--green-95);
              padding: 8px;
              box-sizing: border-box;
              display: flex;
              align-items: center;
            }
          `}</style>
    </>
  )
}
