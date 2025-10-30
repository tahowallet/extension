import { unitPricePointForPricePoint } from "@tallyho/tally-background/assets"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/prices"
import {
  enrichAssetAmountWithDecimalValues,
  heuristicDesiredDecimalsForUnitPrice,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { USD } from "@tallyho/tally-background/constants"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"
import { useBackgroundSelector } from "../../../../../hooks"
import { TransferSummaryBase } from "./TransferSummary"

/**
 * This summary is used in case other summaries cannot be resolved. This
 * generally means the transaction had no enrichment annotations, so it is
 * treated as base asset transfer.
 *
 * Note that in general this should not happen, and if we reach this stage it's
 * likely something has gone wrong in enrichment, since enrichment should
 * annotate a base asset transfer with an AssetTransfer annotation.
 */
export default function TransactionSignatureSummaryDefault({
  transactionRequest,
}: TransactionSignatureSummaryProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })
  const { network } = transactionRequest

  const baseAssetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(state.prices, network.baseAsset, USD.symbol),
  )

  const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
    {
      asset: network.baseAsset,
      amount: transactionRequest.value,
    },
    heuristicDesiredDecimalsForUnitPrice(
      2,
      typeof baseAssetPricePoint !== "undefined"
        ? unitPricePointForPricePoint(baseAssetPricePoint)
        : undefined,
    ),
  )

  return (
    <TransferSummaryBase
      title={t("title")}
      assetAmount={transactionAssetAmount}
      recipientAddress={transactionRequest.to ?? "-"}
    />
  )
}
