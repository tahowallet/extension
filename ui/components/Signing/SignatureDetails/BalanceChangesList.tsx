import React, { ReactElement } from "react"
import type { AssetTransferForAddress } from "@tallyho/tally-background/services/enrichment/utils"
import SharedAssetIcon from "../../Shared/SharedAssetIcon"

type BalanceChangesListProps = {
  label: string
  transfers: AssetTransferForAddress[]
}

export default function BalanceChangesList({
  label,
  transfers,
}: BalanceChangesListProps): ReactElement | null {
  if (transfers.length === 0) return null

  return (
    <>
      <div className="simulated_changes">
        <div className="simulated_changes_label">{label}</div>
        {transfers.map((transfer, index) => (
          <div
            // Transfers carry no stable id, and the same asset can move more
            // than once in a single transaction.
            // eslint-disable-next-line react/no-array-index-key
            key={`${transfer.assetSymbol}-${index}`}
            className="simulated_changes_row"
          >
            <div className="simulated_changes_asset">
              <SharedAssetIcon
                size="small"
                logoURL={transfer.assetLogoUrl ?? ""}
                symbol={transfer.assetSymbol}
              />
              {transfer.assetSymbol}
            </div>
            <div className={`simulated_changes_amount ${transfer.direction}`}>
              {transfer.direction === "in" ? "+" : "-"}
              {transfer.localizedDecimalAmount}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .simulated_changes {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
        }
        .simulated_changes_label {
          color: var(--green-40);
        }
        .simulated_changes_row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .simulated_changes_asset {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--green-20);
        }
        .simulated_changes_amount.in {
          color: var(--success);
        }
        .simulated_changes_amount.out {
          color: var(--error);
        }
      `}</style>
    </>
  )
}
