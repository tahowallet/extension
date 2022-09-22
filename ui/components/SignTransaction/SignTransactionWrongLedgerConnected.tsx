import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"
import SignTransactionSlideUpContentLayout from "./SignTransactionSlideUpContentLayout"

export default function SignTransactionWrongLedgerConnected({
  signerAccountTotal,
}: {
  signerAccountTotal?: AccountTotal
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.wrongLedger",
  })
  const address = signerAccountTotal?.address ?? ""

  return (
    <SignTransactionSlideUpContentLayout
      title={t("title")}
      helpMessage={t("helpMessage")}
      steps={[
        <div className="step_account">
          <div className="step_account_content">
            <div>{t("connectLedger")}</div>
            <div>
              <SharedButton
                iconSmall="new-tab"
                size="small"
                type="deemphasizedWhite"
                onClick={() => {
                  window
                    .open(`https://etherscan.io/address/${address}`, "_blank")
                    ?.focus()
                }}
              >
                {`${address.slice(0, 7)}...${address.slice(-6)}`}
              </SharedButton>
            </div>
          </div>

          <style jsx>{`
            .step_account {
              align-self: flex-start;
            }

            .step_account_content {
              display: flex;
              flex-flow: column;
              gap: 0.5rem;
            }
          `}</style>
        </div>,
        <>{t("refresh")}</>,
      ]}
    />
  )
}
