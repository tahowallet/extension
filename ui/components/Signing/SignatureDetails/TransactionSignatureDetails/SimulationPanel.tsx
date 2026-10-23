import React, { ReactElement } from "react"
import type { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import { getAssetTransfersForAddress } from "@tallyho/tally-background/services/enrichment/utils"
import { useTranslation } from "react-i18next"
import SimulatedBalanceChanges from "./TransactionAdditionalDetails/SimulatedBalanceChanges"
import TransactionSignatureDetailsWarning from "./TransactionSignatureDetailsWarning"

export default function SimulationPanel({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const { annotation } = transactionRequest

  const hasBalanceChanges = [
    transactionRequest.from,
    annotation?.simulatedSafeAddress,
  ].some(
    (address) =>
      address !== undefined &&
      getAssetTransfersForAddress(annotation?.subannotations, address).length >
        0,
  )

  const revertReason = annotation?.simulationRevertReason

  return (
    <div className="simulation_panel standard_width_padded">
      {annotation?.simulationStatus === undefined && (
        <div className="simulation_empty">{t("simulationUnavailable")}</div>
      )}
      {annotation?.simulationStatus === "reverted" &&
        (revertReason ? (
          <TransactionSignatureDetailsWarning
            message={t("simulationReverted")}
            variant="error"
            details={revertReason}
            detailsCopyMessage={t("gasErrorCopied")}
          />
        ) : (
          <TransactionSignatureDetailsWarning
            message={t("simulationReverted")}
            variant="error"
          />
        ))}
      {annotation?.simulationStatus === "success" &&
        (hasBalanceChanges ? (
          <SimulatedBalanceChanges
            transactionRequest={transactionRequest}
            annotation={annotation}
          />
        ) : (
          <div className="simulation_empty">
            {t("simulationNoBalanceChanges")}
          </div>
        ))}
      <style jsx>{`
        .simulation_panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 21px;
        }
        .simulation_empty {
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
        }
      `}</style>
    </div>
  )
}
