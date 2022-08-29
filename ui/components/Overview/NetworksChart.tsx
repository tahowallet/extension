import {
  ETHEREUM,
  ARBITRUM_ONE,
  OPTIMISM,
  NETWORK_BY_CHAIN_ID,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { AccountTotalList } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"

const NETWORKS_CHART_COLORS = {
  [ETHEREUM.chainID]: "#62688F",
  [POLYGON.chainID]: "#8347E5",
  [ARBITRUM_ONE.chainID]: "#2083C5",
  [OPTIMISM.chainID]: "#CD041C",
}

const getNetworksPercents = (
  accountsTotal: AccountTotalList
): { chainID: string; percent: number }[] => {
  let totalsSum = 0
  const totalsByChain: { [chainID: string]: number } = {}

  Object.values(accountsTotal).forEach(({ totals }) =>
    Object.entries(totals).forEach(([chainID, total]) => {
      totalsByChain[chainID] ??= 0
      totalsByChain[chainID] += total
      totalsSum += total
    })
  )

  return Object.entries(totalsByChain).flatMap(([chainID, total]) => {
    const percent = totalsSum ? Math.round((total / totalsSum) * 100) : 0
    return percent > 0
      ? {
          chainID,
          percent,
        }
      : []
  })
}

export default function NetworksChart({
  accountsTotal,
  networksCount,
}: {
  accountsTotal: AccountTotalList
  networksCount: number
}): ReactElement {
  const { t } = useTranslation()
  const percents = getNetworksPercents(accountsTotal)

  return (
    <>
      <div>
        <div className="chains_header">
          {t("overview.networks")}({networksCount})
        </div>
        <div className="chains_chart">
          {percents.map(({ chainID, percent }) => (
            <div
              key={chainID}
              className="chart_item"
              style={{
                width: `${percent}%`,
                background: NETWORKS_CHART_COLORS[chainID],
              }}
            />
          ))}
        </div>
        <div className="chains_legend">
          {percents.map(({ chainID, percent }) => (
            <div className="chains_legend_item" key={chainID}>
              <div
                className="chains_legend_dot"
                style={{ backgroundColor: NETWORKS_CHART_COLORS[chainID] }}
              />
              {NETWORK_BY_CHAIN_ID[chainID].name}({percent}%)
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .chains_header {
          font-weight: 600;
          font-size: 12px;
          line-height: 16px;
          color: var(--green-40);
        }
        .chains_chart {
          margin: 8px 0;
          height: 6px;
          width: 100%;
          display: flex;
          background: var(--green-95);
        }
        .chart_item {
          margin: 0 1px;
        }
        .chart_item:first-child {
          margin-left: 0;
          border-radius: 2px 0 0 2px;
        }
        .chart_item:last-child {
          margin-right: 0;
          border-radius: 0 2px 2px 0;
        }
        .chains_legend {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        .chains_legend_item {
          display: flex;
          align-items: center;
          color: var(--green-40);
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          margin-right: 8px;
          margin-bottom: 4px;
        }
        .chains_legend_dot {
          width: 6px;
          height: 6px;
          border-radius: 100%;
          margin-right: 4px;
        }
      `}</style>
    </>
  )
}
