import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { HexString } from "@tallyho/tally-background/types"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../../../Shared/SharedButton"
import SlideUpContentLayout from "./SlideUpLayout"

export default function WrongLedgerConnected({
  requiredAddress,
}: {
  requiredAddress: HexString
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.wrongLedger",
  })

  return (
    <SlideUpContentLayout
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
                    .open(
                      `https://etherscan.io/address/${requiredAddress}`,
                      "_blank"
                    )
                    ?.focus()
                }}
              >
                {truncateAddress(requiredAddress)}
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
