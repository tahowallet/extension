import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"

interface Props {
  assets: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function OverviewAssetsTable(props: Props): ReactElement {
  const { t } = useTranslation()
  const { assets, initializationLoadingTimeExpired } = props
  if (!assets) return <></>

  function assetSortCompare(a: CompleteAssetAmount, b: CompleteAssetAmount) {
    if (a.mainCurrencyAmount !== b.mainCurrencyAmount) {
      // Any mismatched undefined is ranked below its defined counterpart.
      if (a.mainCurrencyAmount === undefined) {
        return 1
      }
      if (b.mainCurrencyAmount === undefined) {
        return -1
      }

      return b.mainCurrencyAmount - a.mainCurrencyAmount
    }

    // Fall back on symbol comparison.
    return a.asset.symbol.localeCompare(b.asset.symbol)
  }

  return (
    <table className="assets_table standard_width">
      <thead>
        <tr>
          <th>{t("overview.tableHeader.asset")}</th>
          <th>{t("overview.tableHeader.price")}</th>
          <th>{t("overview.tableHeader.balance")}</th>
        </tr>
      </thead>
      <tbody>
        {assets.sort(assetSortCompare).map((asset) => (
          <tr key={asset.asset.metadata?.coinGeckoID || asset.asset.symbol}>
            <td>
              <div className="asset_descriptor">
                <SharedAssetIcon
                  size="small"
                  logoURL={asset?.asset?.metadata?.logoURL}
                  symbol={asset?.asset?.symbol}
                />
                <span className="asset_name">{asset.asset.symbol}</span>
              </div>
            </td>
            <td>
              {asset.localizedUnitPrice ? (
                <div>
                  <span className="lighter_color">$</span>
                  {asset.localizedUnitPrice}
                </div>
              ) : (
                <div className="loading_wrap">
                  {initializationLoadingTimeExpired ? (
                    <></>
                  ) : (
                    <SharedLoadingSpinner size="small" />
                  )}
                </div>
              )}
            </td>
            <td>
              {asset.localizedMainCurrencyAmount && (
                <div>
                  <span className="lighter_color">$</span>
                  {asset.localizedMainCurrencyAmount}
                </div>
              )}
              <div className="balance_token_amount">
                {asset.localizedDecimalAmount}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      <style jsx>{`
        .assets_table {
          margin: 8px 0;
        }
        tr {
          height: 55px;
        }
        thead tr {
          height 32px;
        }
        td,
        th {
          border-bottom: 1px solid var(--green-120);
          text-align: left;
        }
        thead {
          border-bottom: 1px solid var(--green-120);
        }
        th {
          color: var(--green-60);
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
          padding-bottom: 8px;
          vertical-align: bottom;
        }
        td:nth-child(1) {
          width: 40%;
        }
        th:nth-child(2),
        td:nth-child(2) {
          width: 25%;
          text-align: right;
        }
        th:nth-child(3),
        td:nth-child(3) {
          text-align: right;
        }
        .asset_descriptor {
          display: flex;
          align-items: center;
        }
        .balance_token_amount {
          color: var(--green-60);
          font-size: 14px;
          line-height: 16px;
          text-align: right;
          margin-top: 3px;
        }
        .lighter_color {
          color: var(--green-60);
        }
        .asset_name {
          margin-left: 7px;
        }
        .loading_wrap {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </table>
  )
}
