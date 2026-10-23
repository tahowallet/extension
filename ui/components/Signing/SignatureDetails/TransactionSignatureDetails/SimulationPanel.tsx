import React, { ReactElement } from "react"
import type { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import { useTranslation } from "react-i18next"
import SimulatedBalanceChanges from "./TransactionAdditionalDetails/SimulatedBalanceChanges"

/**
 * The simulation's outcome, shown below the transaction details. A revert
 * isn't repeated here: the details already warn about it, alongside the gas
 * estimation warning.
 */
export default function SimulationPanel({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement | null {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const { annotation } = transactionRequest

  if (annotation?.simulationStatus === "reverted") return null

  return (
    <div className="simulation_panel standard_width_padded">
      <div className="simulation_heading">{t("simulationHeading")}</div>
      {annotation?.simulationStatus === "success" ? (
        <SimulatedBalanceChanges
          transactionRequest={transactionRequest}
          annotation={annotation}
        />
      ) : (
        <div className="simulation_empty">{t("simulationUnavailable")}</div>
      )}
      <style jsx>{`
        .simulation_panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 21px;
        }
        .simulation_heading {
          color: var(--green-20);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
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
