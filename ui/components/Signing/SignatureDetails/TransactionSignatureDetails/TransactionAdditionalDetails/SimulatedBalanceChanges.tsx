import React, { ReactElement } from "react"
import { getAssetTransfersForAddress } from "@tallyho/tally-background/services/enrichment/utils"
import { useTranslation } from "react-i18next"
import { TransactionSignatureSummaryProps } from "../TransactionSignatureSummary/TransactionSignatureSummaryProps"
import BalanceChangesList from "../../BalanceChangesList"

export default function SimulatedBalanceChanges({
  transactionRequest,
  annotation,
}: TransactionSignatureSummaryProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })

  const safeAddress = annotation?.simulatedSafeAddress

  return (
    <>
      <BalanceChangesList
        label={t("simulatedBalanceChanges")}
        transfers={getAssetTransfersForAddress(
          annotation?.subannotations,
          transactionRequest.from,
        )}
      />
      {safeAddress !== undefined && (
        <BalanceChangesList
          label={t("simulatedSafeBalanceChanges")}
          transfers={getAssetTransfersForAddress(
            annotation?.subannotations,
            safeAddress,
          )}
        />
      )}
    </>
  )
}
