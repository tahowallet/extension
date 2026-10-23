import React, { ReactElement } from "react"
import { getAssetTransfersForAddress } from "@tallyho/tally-background/services/enrichment/utils"
import { useTranslation } from "react-i18next"
import { TransactionSignatureSummaryProps } from "../TransactionSignatureSummary/TransactionSignatureSummaryProps"
import BalanceChangesList from "../../BalanceChangesList"

/**
 * Simulated balance changes for each party that can be affected: the signing
 * account, and the Safe when the transaction executes one. Each is listed
 * even when nothing moved, so an empty result is explicit about whose
 * balances were checked.
 */
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
        label={t("yourAccountBalanceChanges")}
        transfers={getAssetTransfersForAddress(
          annotation?.subannotations,
          transactionRequest.from,
        )}
        emptyMessage={t("noBalanceChanges")}
      />
      {safeAddress !== undefined && (
        <BalanceChangesList
          label={t("safeBalanceChanges")}
          transfers={getAssetTransfersForAddress(
            annotation?.subannotations,
            safeAddress,
          )}
          emptyMessage={t("noBalanceChanges")}
        />
      )}
    </>
  )
}
