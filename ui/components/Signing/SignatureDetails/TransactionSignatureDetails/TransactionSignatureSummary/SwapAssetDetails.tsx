import React, { ReactElement } from "react"
import { AssetSwap } from "@tallyho/tally-background/services/enrichment"

import { useTranslation } from "react-i18next"
import { SWAP_FEE } from "@tallyho/tally-background/redux-slices/0x-swap"
import { TransactionSignatureSummaryProps } from "./TransactionSignatureSummaryProps"

export default function SwapAssetDetails({
  annotation: { sources },
}: TransactionSignatureSummaryProps<AssetSwap>): ReactElement {
  const { t } = useTranslation()

  return (
    <>
      <div className="swap_details">
        <div className="swap_details_row">
          <div className="swap_details_label">
            {t("signTransaction.swap.daoFee")}
          </div>
          <div className="swap_details_value">{SWAP_FEE * 100}%</div>
        </div>
        <div className="swap_details_row">
          <div className="swap_details_label">
            {t("signTransaction.swap.exchangeRoute")}
          </div>
          <div className="swap_details_value">
            {sources.map((source) => (
              <div className="swap_details_source" key={source.name}>
                {source.proportion * 100}% - {source.name}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .swap_details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .swap_details_row {
          width: 100%;
          display: flex;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
        }
        .swap_details_label {
          margin-right: auto;
          color: var(--green-40);
        }
        .swap_details_value {
          text-align: right;
          color: var(--green-20);
        }
        .swap_details_source {
          margin-bottom: 4px;
        }
      `}</style>
    </>
  )
}
