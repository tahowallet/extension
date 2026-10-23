import React, { ReactElement } from "react"
import type { SafeTransactionSignTypedDataAnnotation } from "@tallyho/tally-background/services/enrichment"
import { useTranslation } from "react-i18next"
import BalanceChangesList from "../BalanceChangesList"
import TransactionSignatureDetailsWarning from "../TransactionSignatureDetails/TransactionSignatureDetailsWarning"

type SafeTransactionSimulationProps = {
  annotation: SafeTransactionSignTypedDataAnnotation
}

export default function SafeTransactionSimulation({
  annotation: { simulation, queuedBefore, nonceAlreadyUsed },
}: SafeTransactionSimulationProps): ReactElement | null {
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction.safe",
  })
  const { t: tShared } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })

  if (simulation === undefined && !nonceAlreadyUsed && !queuedBefore) {
    return null
  }

  return (
    <div className="safe_simulation">
      {nonceAlreadyUsed && (
        <TransactionSignatureDetailsWarning message={t("nonceAlreadyUsed")} />
      )}
      {simulation?.status === "reverted" &&
        (simulation.revertReason ? (
          <TransactionSignatureDetailsWarning
            message={t("simulationReverted")}
            variant="error"
            details={simulation.revertReason}
            detailsCopyMessage={tShared("gasErrorCopied")}
          />
        ) : (
          <TransactionSignatureDetailsWarning
            message={t("simulationReverted")}
            variant="error"
          />
        ))}
      {simulation?.status === "success" && (
        <BalanceChangesList
          label={tShared("simulatedSafeBalanceChanges")}
          transfers={simulation.balanceChanges}
        />
      )}
      {simulation !== undefined && (
        <div className="safe_simulation_note">
          {t("simulatedWithSignatures")}
        </div>
      )}
      {!!queuedBefore && (
        <div className="safe_simulation_note">
          {t("queuedBefore", { count: queuedBefore })}
        </div>
      )}
      <style jsx>{`
        .safe_simulation {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 16px;
        }
        .safe_simulation_note {
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
        }
      `}</style>
    </div>
  )
}
