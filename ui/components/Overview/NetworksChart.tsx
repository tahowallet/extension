import {
  ETHEREUM,
  ARBITRUM_ONE,
  AVALANCHE,
  OPTIMISM,
  POLYGON,
  BINANCE_SMART_CHAIN,
  ROOTSTOCK,
} from "@tallyho/tally-background/constants"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { AccountTotalList } from "@tallyho/tally-background/redux-slices/selectors"
import classNames from "classnames"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { shuffle } from "lodash"
import { selectEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { useBackgroundSelector } from "../../hooks"

const NETWORK_DEFAULT_COLORS = {
  [ETHEREUM.chainID]: "#62688F",
  [POLYGON.chainID]: "#8347E5",
  [ARBITRUM_ONE.chainID]: "#2083C5",
  [OPTIMISM.chainID]: "#CD041C",
  [AVALANCHE.chainID]: "#E84142",
  [BINANCE_SMART_CHAIN.chainID]: "#F3BA2F",
  [ROOTSTOCK.chainID]: "#F18C30",
}

const NETWORK_COLORS = shuffle([
  "#43B69A",
  "#CC3C3C",
  "#EA7E30",
  "#B64396",
  "#EAC130",
  "#D1517F",
  "#CDA928",
  "#5184D1",
  "#9FB643",
  "#404BB2",
  "#43B671",
])

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

  const EVMNetworks = useBackgroundSelector(selectEVMNetworks).reduce(
    (acc: { [chainID: string]: EVMNetwork }, network) => {
      acc[network.chainID] = network
      return acc
    },
    {}
  )
  const availableColors = [...NETWORK_COLORS]
  const percents = getNetworksPercents(accountsTotal).map((percent) => {
    if (NETWORK_DEFAULT_COLORS[percent.chainID]) {
      return {
        ...percent,
        color: NETWORK_DEFAULT_COLORS[percent.chainID],
      }
    }

    if (!availableColors.length) {
      // Reuse colors if we run out
      availableColors.push(...NETWORK_COLORS)
    }
    const color = availableColors.pop()
    return {
      ...percent,
      color,
    }
  })

  return (
    <>
      <div>
        <div
          className={classNames(
            "chains_header",
            isEnabled(FeatureFlags.SUPPORT_NFT_TAB) && "nft-update"
          )}
        >
          {t("overview.networks")} ({networksCount})
        </div>
        <div className="chains_chart">
          {percents.map(({ chainID, percent, color }) => (
            <div
              key={chainID}
              className="chart_item"
              style={{
                width: `${percent}%`,
                background: color,
              }}
            />
          ))}
        </div>
        <div className="chains_legend">
          {percents.map(({ chainID, percent, color }, i) => (
            <div className="chains_legend_item" key={chainID}>
              <div
                className="chains_legend_dot"
                style={{ backgroundColor: color }}
              />
              {EVMNetworks[chainID]?.name || `Network ${i}`}({percent}%)
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

        .chains_header.nft-update {
          font-family: "Segment";
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
          color: var(--white);
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
