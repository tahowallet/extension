import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { ContractInteraction } from "@tallyho/tally-background/services/enrichment"
import TransactionSignatureSummaryBody from "./TransactionSignatureSummaryBody"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"
import SharedAddress from "../../../../Shared/SharedAddress"

export default function ContractInteractionSummary({
  transactionRequest,
  annotation,
}: TransactionSignatureSummaryProps<ContractInteraction>): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction.contractInteraction",
  })

  return (
    <>
      <h1 className="serif_header title">{t("title")}</h1>
      <TransactionSignatureSummaryBody>
        <div className="container">
          <div className="label">{t("interactingWithLabel")}</div>
          {transactionRequest.to === undefined ? (
            t("newlyCreatedContract")
          ) : (
            <SharedAddress
              id="recipientAddress"
              address={transactionRequest.to}
              name={
                annotation !== undefined && "contractInfo" in annotation
                  ? annotation.contractInfo.annotation.nameRecord?.resolved
                      ?.nameOnNetwork.name
                  : undefined
              }
            />
          )}
        </div>
        <style jsx>
          {`
            .label {
              color: var(--green-40);
              font-size: 16px;
              line-height: 24px;
              margin-bottom: 4px;
            }
            .container {
              display: flex;
              margin: 20px 0;
              flex-direction: column;
              align-items: center;
            }
          `}
        </style>
      </TransactionSignatureSummaryBody>
    </>
  )
}
