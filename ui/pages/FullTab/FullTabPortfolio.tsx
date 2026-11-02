import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import {
  getAddressCount,
  getNetworkCountForOverview,
  getTotalBalanceForOverview,
  selectAccountAndTimestampedActivities,
  selectAccountTotalsForOverview,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectInitializationTimeExpired } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector } from "../../hooks"
import BalanceHeader from "../../components/Overview/BalanceHeader"
import AccountList from "../../components/Overview/AccountList"
import NetworksChart from "../../components/Overview/NetworksChart"
import NFTsPortfolioOverview from "../../components/Overview/NFTsPortfolioOverview"
import FullTabSection from "../../components/FullTab/FullTabSection"
import FullTabAssetTable from "../../components/FullTab/FullTabAssetTable"

/**
 * The full-tab portfolio page, which shows the wallet's total balance and
 * assets across every account and network in a wide layout.
 */
export default function FullTabPortfolio(): ReactElement {
  const { t } = useTranslation()
  const accountsTotal = useBackgroundSelector(selectAccountTotalsForOverview)
  const balance = useBackgroundSelector(getTotalBalanceForOverview)
  const networksCount = useBackgroundSelector(getNetworkCountForOverview)
  const accountsCount = useBackgroundSelector(getAddressCount)
  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities,
  )
  const initializationLoadingTimeExpired = useBackgroundSelector(
    selectInitializationTimeExpired,
  )

  const assets = [...combinedData.assets].sort((a, b) => {
    if (a.mainCurrencyAmount === b.mainCurrencyAmount) {
      return a.asset.symbol.localeCompare(b.asset.symbol)
    }
    if (a.mainCurrencyAmount === undefined) return 1
    if (b.mainCurrencyAmount === undefined) return -1
    return b.mainCurrencyAmount - a.mainCurrencyAmount
  })

  return (
    <FullTabSection title={t("tabs.portfolio")}>
      <div className="grid">
        <div className="balance card">
          <BalanceHeader
            balance={balance}
            initializationTimeExpired={initializationLoadingTimeExpired}
          />
        </div>
        <div className="card padded">
          <AccountList
            accountsTotal={accountsTotal}
            accountsCount={accountsCount}
          />
        </div>
        <div className="card padded">
          <NetworksChart
            accountsTotal={accountsTotal}
            networksCount={networksCount}
          />
        </div>
        <div className="wide">
          <NFTsPortfolioOverview />
        </div>
        <div className="wide">
          <h2>
            {t("fullTab.portfolio.assets", {
              count: combinedData.assets.length,
            })}
          </h2>
          <div className="card">
            <FullTabAssetTable
              assetAmounts={assets}
              initializationLoadingTimeExpired={
                initializationLoadingTimeExpired
              }
            />
          </div>
        </div>
      </div>
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          align-items: start;
        }
        .balance,
        .wide {
          grid-column: 1 / -1;
        }
        .card {
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          overflow: hidden;
        }
        .padded {
          padding: 16px;
        }
        h2 {
          margin: 0 0 12px;
          font-size: 20px;
          font-weight: 500;
          color: var(--text-strong);
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </FullTabSection>
  )
}
