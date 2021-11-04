import React, { ReactElement, useState } from "react"
import { Redirect } from "react-router-dom"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import { useBackgroundSelector } from "../hooks"
import CorePage from "../components/Core/CorePage"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import WalletAssetList from "../components/Wallet/WalletAssetList"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl"

export default function Wallet(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)
  //  accountLoading, hasWalletErrorCode
  const { combinedData, accountData, activity } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  // If an account doesn't exist, display view only
  // onboarding for the initial test release.
  if (Object.keys(accountData).length === 0) {
    return <Redirect to="/onboarding/viewOnlyWallet" />
  }

  const displayAssets = combinedData.assets

  return (
    <div className="wrap">
      <CorePage>
        <div className="page_content">
          <div className="section">
            <WalletAccountBalanceControl
              balance={combinedData.totalUserValue}
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
                <WalletAssetList assetAmounts={displayAssets} />
              ) : (
                <WalletActivityList activity={activity} />
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
