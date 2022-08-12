import {
  ETHEREUM,
  NETWORK_BY_CHAIN_ID,
  POLYGON,
} from "@tallyho/tally-background/constants"
import { getNetworkCount } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"

const mock = {
  "1": {
    "0xf6ff2962af467ca09d27378559b92ad912006719": 23,
    "0xg6ff2962af467ca09d27378559b92ad912006719": 22,
  },
  "137": {
    "0xf6ff2962af467ca09d27378559b92ad912006719": 333,
    "0xg6ff2962af467ca09d27378559b92ad912006719": 123,
  },
}

const NETWORKS_CHART_COLORS = {
  [ETHEREUM.chainID]: "#62688F",
  [POLYGON.chainID]: "#8347E5",
}

type AccountsBalance = {
  [chainID: string]: {
    [address: string]: number
  }
}

const getBalanceSum = (balances: { [key: string]: number }) =>
  Object.values(balances).reduce(
    (total, currentBalance) => total + currentBalance,
    0
  )

const getNetworksPercents = (
  accountBalances: AccountsBalance
): [string, number][] => {
  const sumByNetwork = Object.fromEntries(
    Object.entries(accountBalances).map(([chainID, addresses]) => [
      chainID,
      getBalanceSum(addresses),
    ])
  )

  const totalSum = getBalanceSum(sumByNetwork)

  return Object.entries(sumByNetwork).map(([chainID, balance]) => [
    chainID,
    Math.round((balance / totalSum) * 100),
  ])
}

export default function NetworksChart(): ReactElement {
  const networksCount = useBackgroundSelector(getNetworkCount)
  const totals = mock
  const percents = getNetworksPercents(totals)

  return (
    <>
      <div>
        <div className="chains_header">Networks({networksCount})</div>
        <div className="chains_chart">
          {percents.map(([chainID, percent]) => (
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
          {percents.map(([chainID, percent]) => (
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
        }
        .chart_item {
          margin: 0 1px;
        }
        .chart_item:first-child {
          border-radius: 2px 0 0 2px;
        }
        .chart_item:last-child {
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
