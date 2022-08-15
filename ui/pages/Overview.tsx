import React, { ReactElement, useState } from "react"
import {
  getAddressCount,
  getNetworkCount,
  selectAccountAndTimestampedActivities,
  selectAccountsTotal,
} from "@tallyho/tally-background/redux-slices/selectors"
import { SUPPORT_NFTS } from "@tallyho/tally-background/features"
import { selectInitializationTimeExpired } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector } from "../hooks"
import OverviewAssetsTable from "../components/Overview/OverviewAssetsTable"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsOverview from "../components/NFTs/NFTsOverview"
import SharedBanner from "../components/Shared/SharedBanner"
import BalanceHeader from "../components/Overview/BalanceHeader"
import NetworksChart from "../components/Overview/NetworksChart"
import AccountList from "../components/Overview/AccountList"

const panelNames = ["Assets", "NFTs"]

export default function Overview(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)
  const accountsTotal = useBackgroundSelector(selectAccountsTotal)
  const networksCount = useBackgroundSelector(getNetworkCount)
  const accountsCount = useBackgroundSelector(getAddressCount)

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )
  const initializationLoadingTimeExpired = useBackgroundSelector(
    selectInitializationTimeExpired
  )

  return (
    <>
      <section className="stats">
        <BalanceHeader
          balance={combinedData.totalMainCurrencyValue}
          initializationTimeExpired={initializationLoadingTimeExpired}
        />
        <AccountList
          accountsTotal={accountsTotal}
          accountsCount={accountsCount}
        />
        <NetworksChart
          accountsTotal={accountsTotal}
          networksCount={networksCount}
        />
      </section>
      {SUPPORT_NFTS && (
        <div className="panel_switcher">
          <SharedPanelSwitcher
            setPanelNumber={setPanelNumber}
            panelNumber={panelNumber}
            panelNames={panelNames}
          />
        </div>
      )}
      {panelNumber === 0 && (
        <OverviewAssetsTable
          assets={combinedData.assets}
          initializationLoadingTimeExpired={initializationLoadingTimeExpired}
        />
      )}
      {panelNumber === 1 && SUPPORT_NFTS && (
        <>
          <SharedBanner
            icon="notif-announcement"
            iconColor="var(--link)"
            canBeClosed
            id="nft_soon"
            customStyles="margin: 8px 0;"
          >
            Coming soon: NFT price + sending
          </SharedBanner>
          <NFTsOverview />
        </>
      )}
      <style jsx>
        {`
          .stats {
            padding: 16px 16px 24px;
            width: calc(100% - 32px);
          }
          .panel_switcher {
            width: 100%;
          }
        `}
      </style>
    </>
  )
}
