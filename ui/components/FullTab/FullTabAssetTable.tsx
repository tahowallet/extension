import React, { ReactElement, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import {
  getFullAssetID,
  isNetworkBaseAsset,
  isUntrustedAsset,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  AnyAsset,
  isSmartContractFungibleAsset,
} from "@tallyho/tally-background/assets"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import { displayAssetAmount } from "../../utils/amounts"

/**
 * Returns a stable key for an asset, suitable for use as a React key. Smart
 * contract and network base assets use their full asset id; other assets,
 * which don't have one, fall back to their symbol.
 */
export const assetKey = (asset: AnyAsset): string =>
  isSmartContractFungibleAsset(asset) || isNetworkBaseAsset(asset)
    ? getFullAssetID(asset)
    : asset.symbol

type Props = {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
  /** Renders the trailing cell of each row, typically its actions. */
  renderActions?: (assetAmount: CompleteAssetAmount) => ReactNode
  /** Renders a leading cell of each row, such as a selection checkbox. */
  renderLeading?: (assetAmount: CompleteAssetAmount) => ReactNode
  leadingHeader?: ReactNode
  onRowClick?: (assetAmount: CompleteAssetAmount) => void
  emptyMessage?: string
}

/**
 * Renders a wide table of asset balances, with one row per asset showing the
 * asset, its unit price, the amount held, and its value in the main currency.
 * Callers can add a leading cell, such as a selection checkbox, and a
 * trailing cell, typically the asset's actions, to each row.
 *
 * Note that prices and values are never shown for untrusted assets.
 */
export default function FullTabAssetTable({
  assetAmounts,
  initializationLoadingTimeExpired,
  renderActions,
  renderLeading,
  leadingHeader,
  onRowClick,
  emptyMessage,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "fullTab.table" })

  const loadingOrEmpty = (value: string | undefined, prefix = "$") => {
    if (value !== undefined) return `${prefix}${value}`
    if (!initializationLoadingTimeExpired) {
      return <SharedLoadingSpinner size="small" />
    }
    return <span className="muted">—</span>
  }

  if (assetAmounts.length === 0) {
    return (
      <p style={{ color: "var(--green-40)", padding: 16, margin: 0 }}>
        {emptyMessage ?? t("empty")}
      </p>
    )
  }

  return (
    <table>
      <thead>
        <tr>
          {renderLeading && <th className="leading">{leadingHeader}</th>}
          <th>{t("asset")}</th>
          <th className="numeric price">{t("price")}</th>
          <th className="numeric">{t("balance")}</th>
          <th className="numeric">{t("value")}</th>
          {renderActions && (
            <th className="actions" aria-label={t("actions")} />
          )}
        </tr>
      </thead>
      <tbody>
        {assetAmounts.map((assetAmount) => {
          const amount = displayAssetAmount(assetAmount)
          const untrusted = isUntrustedAsset(assetAmount.asset)

          return (
            <tr
              key={assetKey(assetAmount.asset)}
              className={onRowClick ? "clickable" : undefined}
              onClick={() => onRowClick?.(assetAmount)}
            >
              {renderLeading && (
                <td className="leading">{renderLeading(assetAmount)}</td>
              )}
              <td>
                <div className="asset">
                  <SharedAssetIcon
                    size="medium"
                    logoURL={assetAmount.asset.metadata?.logoURL}
                    symbol={assetAmount.asset.symbol}
                    untrusted={untrusted}
                  />
                  <div className="asset_names">
                    <span className="symbol" title={assetAmount.asset.symbol}>
                      {assetAmount.asset.symbol}
                    </span>
                    <span className="name" title={assetAmount.asset.name}>
                      {assetAmount.asset.name}
                    </span>
                  </div>
                </div>
              </td>
              <td className="numeric price">
                {untrusted ? (
                  <span className="muted">—</span>
                ) : (
                  loadingOrEmpty(assetAmount.localizedUnitPrice)
                )}
              </td>
              <td className="numeric" title={amount.title}>
                {amount.text}
              </td>
              <td className="numeric strong">
                {untrusted ? (
                  <span className="muted">—</span>
                ) : (
                  loadingOrEmpty(assetAmount.localizedMainCurrencyAmount)
                )}
              </td>
              {renderActions && (
                <td className="actions">
                  {/* Actions handle their own clicks, so they are stopped
                      here rather than also triggering the row's handler. */}
                  {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <div
                    className="actions_wrap"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {renderActions(assetAmount)}
                  </div>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
      <style jsx>{`
        table {
          width: 100%;
          table-layout: fixed;
          border-collapse: separate;
          border-spacing: 0;
        }
        th {
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--green-40);
          padding: 8px 16px;
          border-bottom: 1px solid var(--green-80);
        }
        td {
          padding: 12px 16px;
          color: var(--green-20);
          font-size: 16px;
          font-weight: 500;
          border-bottom: 1px solid var(--green-95);
          transition: background-color 0.2s ease;
          vertical-align: middle;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        tbody tr {
          animation: row_in 0.35s ease both;
        }
        tbody tr:nth-child(2) {
          animation-delay: 0.03s;
        }
        tbody tr:nth-child(3) {
          animation-delay: 0.06s;
        }
        tbody tr:nth-child(4) {
          animation-delay: 0.09s;
        }
        tbody tr:nth-child(n + 5) {
          animation-delay: 0.12s;
        }
        @keyframes row_in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          tbody tr {
            animation: none;
          }
        }
        tr.clickable {
          cursor: pointer;
        }
        tr.clickable:hover td {
          background-color: var(--green-95);
        }
        .numeric {
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .strong {
          color: var(--text-strong);
        }
        .muted {
          color: var(--green-60);
        }
        th.numeric {
          width: 15%;
        }
        .leading {
          width: 24px;
          padding-right: 0;
        }
        th.actions {
          width: 200px;
        }
        /* In narrow windows, the unit price column is hidden and the other
           numeric columns widen to take its space. */
        @media (max-width: 1180px) {
          .price {
            display: none;
          }
          th.numeric {
            width: 22%;
          }
          th.actions {
            width: 104px;
          }
        }
        .actions {
          white-space: nowrap;
        }
        .actions_wrap {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .asset {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .asset_names {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .symbol {
          color: var(--text-strong);
          font-weight: 600;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .name {
          color: var(--green-40);
          font-size: 14px;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </table>
  )
}
