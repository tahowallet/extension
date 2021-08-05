import React, { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { registerRoute } from "../config/routes"
import CorePage from "../components/Core/CorePage"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import WalletAssetList from "../components/Wallet/WalletAssetList"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl"
import { subscribeToAccount, accountSelector } from "../slices/account"

export default function Wallet() {
  const [panelNum, setPanelNum] = useState(0)
  const dispatch = useDispatch()
  //  accountLoading, hasWalletErrorCode
  const { account } = useSelector(accountSelector)

  useEffect(() => {
    dispatch(subscribeToAccount())
  }, [])

  return (
    <div className="wrap">
      <CorePage>
        <div className="page_content">
          <div className="section">
            <WalletAccountBalanceControl
              balance={account?.total_balance?.usd_amount}
            />
          </div>
          <div className="section">
            <SharedPanelSwitcher
              setPanelNum={setPanelNum}
              panelNum={panelNum}
              panelNames={["Assets", "Activity"]}
            />
            <div className="panel">
              {panelNum === 0 ? (
                <WalletAssetList assets={account?.tokens} />
              ) : (
                <WalletActivityList activity={account?.activity} />
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

registerRoute("wallet", Wallet)
