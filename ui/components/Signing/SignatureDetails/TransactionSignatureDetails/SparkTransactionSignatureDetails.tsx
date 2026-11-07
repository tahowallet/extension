import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import type { SparkTransactionRequest } from "@tallyho/tally-background/networks"
import { isLightningInvoice } from "@tallyho/tally-background/lib/lightning-invoice"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/prices"
import {
  getPricesState,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { useBackgroundSelector, useSwitchablePanels } from "../../../../hooks"
import { TransferSummaryBase } from "./TransactionSignatureSummary/TransferSummary"
import TransactionSignatureDetailsWarning from "./TransactionSignatureDetailsWarning"

function sats(amount: bigint): string {
  return `${amount.toLocaleString("en-US")} sats`
}

/**
 * Details of a Spark payment on the signing screen: the same transfer
 * summary and Details panel as an EVM transfer, with Spark's fee (none for
 * Spark transfers, a routing fee for Lightning) in place of gas settings,
 * which don't apply.
 */
export default function SparkTransactionSignatureDetails({
  transactionRequest,
}: {
  transactionRequest: SparkTransactionRequest
}): ReactElement {
  const { t } = useTranslation()
  const { network, value, to, estimatedFee, maxFee, memo } = transactionRequest
  const prices = useBackgroundSelector(getPricesState)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const isLightning = isLightningInvoice(to)

  const assetAmount = enrichAssetAmountWithDecimalValues(
    { asset: network.baseAsset, amount: value },
    network.baseAsset.decimals,
  )

  const feeInMainCurrency = enrichAssetAmountWithMainCurrencyValues(
    { asset: network.baseAsset, amount: estimatedFee },
    selectAssetPricePoint(prices, network.baseAsset, mainCurrencySymbol),
    2,
  ).localizedMainCurrencyAmount

  const panels = useSwitchablePanels([
    {
      name: t("signTransaction.detailPanelName"),
      panelElement: () => (
        <div className="detail_items_wrap standard_width_padded">
          <span className="detail_item">
            <div className="detail_label">
              {t("signTransaction.spark.paymentType")}
            </div>
            <div className="detail_value">
              {isLightning
                ? t("signTransaction.spark.lightning")
                : t("signTransaction.spark.sparkTransfer")}
            </div>
          </span>
          <span className="detail_item" data-testid="spark_network_fee">
            <div className="detail_label">
              {t("networkFees.estimatedNetworkFee")}
            </div>
            <div className="detail_value">
              {estimatedFee === 0n
                ? t("signTransaction.spark.noFee")
                : `${sats(estimatedFee)}${
                    feeInMainCurrency ? ` (~$${feeInMainCurrency})` : ""
                  }`}
            </div>
          </span>
          {isLightning && (
            <span className="detail_item">
              <div className="detail_label">
                {t("signTransaction.spark.maxFee")}
              </div>
              <div className="detail_value">{sats(maxFee)}</div>
            </span>
          )}
          {memo && (
            <span className="detail_item">
              <div className="detail_label">
                {t("signTransaction.spark.memo")}
              </div>
              <div className="detail_value">{memo}</div>
            </span>
          )}
          {transactionRequest.warnings?.includes("insufficient-funds") && (
            <span className="detail_item">
              <TransactionSignatureDetailsWarning
                message={t("signTransaction.spark.insufficientFunds")}
              />
            </span>
          )}
          <span className="detail_item total">
            <div className="detail_label">
              {t("signTransaction.spark.total")}
            </div>
            <div className="detail_value">{sats(value + estimatedFee)}</div>
          </span>
          <style jsx>{`
            .detail_items_wrap {
              display: flex;
              margin-top: 21px;
              gap: 10px;
              flex-direction: column;
            }
            .detail_item {
              width: 100%;
              color: var(--green-40);
              font-size: 14px;
              line-height: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
            }
            .detail_label {
              font-weight: 500;
              letter-spacing: 0.03em;
            }
            .detail_value {
              color: var(--green-20);
              text-align: right;
              overflow-wrap: anywhere;
            }
            .total .detail_value {
              color: var(--white);
              font-weight: 500;
            }
          `}</style>
        </div>
      ),
    },
    {
      name: t("signTransaction.rawDataPanelName"),
      panelElement: () => (
        <pre className="raw standard_width_padded">
          {JSON.stringify(
            transactionRequest,
            (_, field) =>
              typeof field === "bigint" ? field.toString() : field,
            2,
          )}
          <style jsx>{`
            .raw {
              margin-top: 16px;
              font-size: 12px;
              color: var(--green-40);
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }
          `}</style>
        </pre>
      ),
    },
  ])

  return (
    <>
      <div className="standard_width">
        <TransferSummaryBase assetAmount={assetAmount} recipientAddress={to} />
      </div>
      {panels}
    </>
  )
}
