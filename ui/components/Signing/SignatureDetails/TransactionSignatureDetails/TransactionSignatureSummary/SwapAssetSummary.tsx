import { AssetSwap } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"
import SigningDataTransactionSummaryBody from "./TransactionSignatureSummaryBody"
import SwapQuoteBalanceChange from "../../../../Swap/SwapQuoteBalanceChange"

export default function SwapAssetSummary({
  annotation: { fromAssetAmount, toAssetAmount, estimatedPriceImpact },
}: TransactionSignatureSummaryProps<AssetSwap>): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "swap" })

  return (
    <>
      <h1 className="serif_header title">{t("transaction.header")}</h1>
      <SigningDataTransactionSummaryBody>
        <SwapQuoteBalanceChange
          fromAsset={fromAssetAmount}
          toAsset={toAssetAmount}
          priceImpact={estimatedPriceImpact}
        />
      </SigningDataTransactionSummaryBody>
      <style jsx>{`
        .title {
          color: var(--trophy-gold);
          font-size: 36px;
          font-weight: 500;
          line-height: 42px;
          text-align: center;
        }
      `}</style>
    </>
  )
}
