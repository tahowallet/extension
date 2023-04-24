import { AssetSwap } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  getAssetsState,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import { useTranslation } from "react-i18next"
import { utils } from "ethers"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"
import { useBackgroundSelector } from "../../../../../hooks"
import SigningDataTransactionSummaryBody from "./TransactionSignatureSummaryBody"
import SharedAddress from "../../../../Shared/SharedAddress"
import SwapQuoteAssetCard from "../../../../Swap/SwapQuoteAssetCard"

export default function SwapAssetSummary({
  annotation: { fromAssetAmount, toAssetAmount, sources, swapContractInfo },
  transactionRequest: { to },
}: TransactionSignatureSummaryProps<AssetSwap>): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "swap" })
  const assets = useBackgroundSelector(getAssetsState)

  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)

  const fromAssetPricePoint = selectAssetPricePoint(
    assets,
    fromAssetAmount.asset,
    mainCurrencySymbol
  )
  const localizedFromMainCurrencyAmount =
    enrichAssetAmountWithMainCurrencyValues(
      fromAssetAmount,
      fromAssetPricePoint,
      2
    ).localizedMainCurrencyAmount ?? "-"

  const toAssetPricePoint = selectAssetPricePoint(
    assets,
    toAssetAmount.asset,
    mainCurrencySymbol
  )
  const localizedToMainCurrencyAmount =
    enrichAssetAmountWithMainCurrencyValues(toAssetAmount, toAssetPricePoint, 2)
      .localizedMainCurrencyAmount ?? "-"

  const { sellAmount, buyAmount } = {
    sellAmount: utils.formatUnits(
      fromAssetAmount.amount,
      fromAssetAmount.asset.decimals
    ),
    buyAmount: utils.formatUnits(
      toAssetAmount.amount,
      toAssetAmount.asset.decimals
    ),
  }

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
        <div className="quote_cards">
          <SwapQuoteAssetCard
            label={t("sellAsset")}
            asset={fromAssetAmount.asset}
            amount={sellAmount}
          />
          <span className="icon_switch" />
          <SwapQuoteAssetCard
            label={t("buyAsset")}
            asset={toAssetAmount.asset}
            amount={buyAmount}
          />
        </div>
        <span className="label label_right">
          {mainCurrencySymbol} {localizedFromMainCurrencyAmount} in{" "}
          {fromAssetAmount.asset.symbol} = {mainCurrencySymbol}{" "}
          {localizedToMainCurrencyAmount} in {toAssetAmount.asset.symbol}
        </span>
        <div className="exchange_section_wrap">
          <span className="top_label label">{t("exchangeRoute")}</span>

          {sources.map((source) => (
            <div className="exchange_content standard_width" key={source.name}>
              <div className="left">
                {source.name.includes("Uniswap") && (
                  <span className="icon_uniswap" />
                )}
                {source.name}
              </div>
              <div>{source.proportion * 100}%</div>
            </div>
          ))}
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
              display: grid;
              grid-template: "icon amount"
                             "icon symbol" / 40px 1fr;
              width: 108px;
              height: 48px;
              border-radius: 4px;
              background-color: var(--green-95);
              padding: 8px;
              box-sizing: border-box;
              align-items: center;
            }
            .asset_item > :global(.token_icon_wrap) {
              grid-area: icon;
            }
            .asset_item .asset_name {
              grid-area: symbol;
            }
            .asset_item .asset_amount {
              grid-area: amount;
            }
            .quote_cards {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .exchange_section_wrap {
              margin-top: 16px;
            }
            .exchange_content, .exchange_section_wrap .label {
              padding: 0 16px;
            }
            .exchange_content {
              height: 40px;
              border-radius: 4px;
              color: var(--green-20);
              font-size: 14px;
              font-weight: 400;
              letter-spacing: 0.42px;
              line-height: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-sizing: border-box;
            }
          `}</style>
    </>
  )
}
