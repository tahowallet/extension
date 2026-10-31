import React, { ReactElement } from "react"
import type { AssetTransferForAddress } from "@tallyho/tally-background/services/enrichment/utils"
import { useTranslation } from "react-i18next"
import SharedAddress from "./SharedAddress"
import SharedAssetIcon from "./SharedAssetIcon"
import SharedIcon from "./SharedIcon"
import SharedTooltip from "./SharedTooltip"

type SharedBalanceChangesListProps = {
  label: string
  transfers: AssetTransferForAddress[]
  /** Shown beside the label when nothing moved; without it, nothing renders. */
  emptyMessage?: string
}

export default function SharedBalanceChangesList({
  label,
  transfers,
  emptyMessage,
}: SharedBalanceChangesListProps): ReactElement | null {
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction",
  })

  if (transfers.length === 0 && emptyMessage === undefined) return null

  return (
    <>
      <div className="simulated_changes">
        {transfers.length === 0 ? (
          <div className="simulated_changes_row">
            <div className="simulated_changes_label">{label}</div>
            <div className="simulated_changes_empty">{emptyMessage}</div>
          </div>
        ) : (
          <div className="simulated_changes_label">{label}</div>
        )}
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
                size={24}
                logoURL={transfer.assetLogoUrl ?? ""}
                symbol={transfer.assetSymbol}
                untrusted={transfer.untrackedAsset}
              />
              <span
                className={`simulated_changes_amount ${transfer.direction}`}
              >
                {transfer.direction === "in" ? "+" : "-"}
                {transfer.localizedDecimalAmount}
              </span>
              <span
                className="simulated_changes_symbol"
                title={transfer.assetSymbol}
              >
                {transfer.assetSymbol}
              </span>
              {transfer.untrackedAsset && (
                <SharedTooltip
                  width={200}
                  verticalPosition="top"
                  horizontalPosition="right"
                  style={{ margin: "-5px 0", flexShrink: 0 }}
                  IconComponent={() => (
                    <SharedIcon
                      icon="icons/s/notif-attention.svg"
                      // Sized to the 14px row text it sits in.
                      width={14}
                      color="var(--attention)"
                      ariaLabel={t("untrackedToken")}
                    />
                  )}
                >
                  {t("untrackedTokenExplanation")}
                </SharedTooltip>
              )}
            </div>
            <div className="simulated_changes_counterparty">
              {transfer.direction === "in"
                ? t("balanceChangeFrom")
                : t("balanceChangeTo")}
              <SharedAddress
                address={transfer.counterparty.address}
                name={transfer.counterparty.name}
                nameResolverSystem={transfer.counterparty.nameResolverSystem}
                compact
              />
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
        .simulated_changes_empty {
          color: var(--green-40);
          font-weight: 400;
        }
        .simulated_changes_row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .simulated_changes_asset {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--green-20);
          min-width: 0;
        }
        .simulated_changes_amount {
          flex-shrink: 0;
          white-space: nowrap;
        }
        /* Symbols are whatever a token says they are, so can be any length;
           this is what gives way when the row runs out of room. */
        .simulated_changes_symbol {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .simulated_changes_amount.in {
          color: var(--success);
        }
        .simulated_changes_amount.out {
          color: var(--error);
        }
        .simulated_changes_counterparty {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          color: var(--green-40);
        }
      `}</style>
    </>
  )
}
