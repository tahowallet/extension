import { formatUnits } from "@ethersproject/units"
import { AnyAssetAmount, FungibleAsset } from "@tallyho/tally-background/assets"
import {
  AssetDecimalAmount,
  enrichAssetAmountWithMainCurrencyValues,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { truncateDecimalAmount } from "@tallyho/tally-background/lib/utils"
import {
  getAssetsState,
  selectMainCurrencySign,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import { useBackgroundSelector } from "../../hooks"
import PriceDetails from "../Shared/PriceDetails"

type SwapQuoteBalanceChangeProps = {
  fromAsset: AnyAssetAmount<FungibleAsset> & AssetDecimalAmount
  toAsset: AnyAssetAmount<FungibleAsset> & AssetDecimalAmount
  priceImpact: number
}
export default function SwapQuoteBalanceChange(
  props: SwapQuoteBalanceChangeProps
): ReactElement {
  const { fromAsset, toAsset, priceImpact } = props
  const { t } = useTranslation()
  const assets = useBackgroundSelector(getAssetsState)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)

  const rawFromAmount = formatUnits(fromAsset.amount, fromAsset.asset.decimals)
  const fromAmount = truncateDecimalAmount(rawFromAmount, 2, 8)
  const rawToAmount = formatUnits(toAsset.amount, toAsset.asset.decimals)
  const toAmount = truncateDecimalAmount(rawToAmount, 2, 8)

  const fromAssetPricePoint = selectAssetPricePoint(
    assets,
    fromAsset.asset,
    mainCurrencySymbol
  )
  const toAssetPricePoint = selectAssetPricePoint(
    assets,
    toAsset.asset,
    mainCurrencySymbol
  )

  const fromAssetMainCurrencyAmount = enrichAssetAmountWithMainCurrencyValues(
    fromAsset,
    fromAssetPricePoint,
    2
  ).localizedMainCurrencyAmount
  const toAssetMainCurrencyAmount = enrichAssetAmountWithMainCurrencyValues(
    toAsset,
    toAssetPricePoint,
    2
  ).localizedMainCurrencyAmount

  return (
    <>
      <div className="balance_change">
        <div className="balance_change_header">
          {t("signTransaction.swap.balanceChange")}
        </div>

        <div className="balance_token sell">
          <SharedAssetIcon
            size={32}
            logoURL={fromAsset.asset.metadata?.logoURL}
            symbol={fromAsset.asset.symbol}
          />
          <div
            className="balance_token_value amount "
            title={`${rawFromAmount} ${fromAsset.asset.symbol}`}
          >
            -{fromAmount}
          </div>
          <div className="balance_token_value symbol">
            {fromAsset.asset.symbol}
          </div>
          <div className="balance_token_price">
            <PriceDetails
              amountMainCurrency={fromAssetMainCurrencyAmount}
              mainCurrencySign={mainCurrencySign}
              isLoading={false}
            />
          </div>
        </div>

        <div className="balance_token buy">
          <SharedAssetIcon
            size={32}
            logoURL={toAsset.asset.metadata?.logoURL}
            symbol={toAsset.asset.symbol}
          />
          <div
            className="balance_token_value amount"
            title={`${rawToAmount} ${toAsset.asset.symbol}`}
          >
            +{toAmount}
          </div>
          <div className="balance_token_value symbol">
            {toAsset.asset.symbol}
          </div>
          <div className="balance_token_price">
            <PriceDetails
              amountMainCurrency={toAssetMainCurrencyAmount}
              mainCurrencySign={mainCurrencySign}
              isLoading={false}
              priceImpact={priceImpact}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .balance_change {
          font-family: Segment;
          box-sizing: border-box;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .balance_change_header {
          color: var(--green-20);
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
        }
        .balance_token {
          display: flex;
          align-items: center;
        }
        .sell {
          color: var(--trading-outgoing);
        }
        .buy {
          color: var(--trading-incoming);
        }
        .balance_token_value {
          font-weight: 500;
          line-height: 32px;
        }
        .balance_token_value.amount {
          font-size: 22px;
          margin: 0 2px 0 8px;
        }
        .balance_token_value.symbol {
          font-size: 16px;
          margin: 0 8px 0 2px;
        }
        .balance_token_price {
          margin-left: auto;
          font-size: 12px;
          color: var(--green-20);
        }
      `}</style>
    </>
  )
}
