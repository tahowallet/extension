import React, { ReactElement, useState } from "react"
import { Redirect } from "react-router-dom"
import {
  selectCurrentAccountActivitiesWithTimestamps,
  selectCurrentAccountBalances,
} from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../hooks"
import CorePage from "../components/Core/CorePage"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import WalletAssetList from "../components/Wallet/WalletAssetList"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl"

export default function Wallet(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  //  accountLoading, hasWalletErrorCode
  const accountData = useBackgroundSelector(selectCurrentAccountBalances)

  const { assetAmounts, totalMainCurrencyValue } = accountData ?? {
    assetAmounts: [],
    totalMainCurrencyValue: undefined,
  }
  const currentAccountActivities = useBackgroundSelector(
    selectCurrentAccountActivitiesWithTimestamps
  )

  const initializationLoadingTimeExpired = useBackgroundSelector(
    (background) => background.ui?.initializationLoadingTimeExpired
  )

  // If an account doesn't exist, display onboarding
  if (typeof accountData === "undefined") {
    return <Redirect to="/onboarding/infoIntro" />
  }

  return (
    <div className="wrap">
      <CorePage>
        <div className="page_content">
          <div className="section">
            <WalletAccountBalanceControl
              balance={totalMainCurrencyValue}
              initializationLoadingTimeExpired={
                initializationLoadingTimeExpired
              }
            />
          </div>
          <div className="section">
            <SharedPanelSwitcher
              setPanelNumber={setPanelNumber}
              panelNumber={panelNumber}
              panelNames={["Assets", "Activity"]}
            />
            <div className="panel">
              {panelNumber === 0 ? (
                <WalletAssetList
                  assetAmounts={assetAmounts}
                  initializationLoadingTimeExpired={
                    initializationLoadingTimeExpired
                  }
                />
              ) : (
                <WalletActivityList activities={currentAccountActivities} />
              )}
            </div>
          </div>
        </div>
      </CorePage>
      <style jsx>
        {`
          .wrap {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .page_content {
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100vw;
          }
          .panel {
            height: 284px;
            padding-top: 16px;
            box-sizing: border-box;
          }
          .panel::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  )
}
