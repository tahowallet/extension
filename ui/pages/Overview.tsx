import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  getAddressCount,
  getNetworkCount,
  selectAccountAndTimestampedActivities,
} from "@tallyho/tally-background/redux-slices/selectors"
import { SUPPORT_NFTS } from "@tallyho/tally-background/features"
import { useBackgroundSelector } from "../hooks"
import OverviewAssetsTable from "../components/Overview/OverviewAssetsTable"
import SharedLoadingSpinner from "../components/Shared/SharedLoadingSpinner"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import NFTsOverview from "../components/NFTs/NFTsOverview"
import SharedBanner from "../components/Shared/SharedBanner"

export default function Overview(): ReactElement {
  const { t } = useTranslation()

  const [panelNumber, setPanelNumber] = useState(0)
  const panelNames = ["Assets", "NFTs"]

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const {
    initializationLoadingTimeExpired,
    numberOfAddresses,
    numberOfNetworks,
  } = useBackgroundSelector((state) => {
    return {
      numberOfNetworks: getNetworkCount(state),
      numberOfAddresses: getAddressCount(state),
      initializationLoadingTimeExpired:
        state.ui?.initializationLoadingTimeExpired,
    }
  })

  return (
    <>
      <header className="standard_width">
        <div className="header_primary_content">
          <span className="total_balance_label">
            {t("overview.totalBalance")}
          </span>
          <div className="primary_balance">
            {initializationLoadingTimeExpired ||
            combinedData?.totalMainCurrencyValue ? (
              <>
                <span className="primary_money_sign">$</span>
                {combinedData?.totalMainCurrencyValue ?? "0"}
              </>
            ) : (
              <div className="loading_wrap">
                <SharedLoadingSpinner />
              </div>
            )}
          </div>
        </div>
        <div className="sub_info_row">
          <div className="info_group_item">
            <span className="info_left">{t("overview.networks")}</span>
            {numberOfNetworks}
          </div>
          <div className="info_group_item">
            <span className="info_left">{t("overview.addresses")}</span>
            {numberOfAddresses}
          </div>
          <div className="info_group_item">
            <span className="info_left">{t("overview.assets")}</span>
            {combinedData.assets.length}
          </div>
        </div>
      </header>
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
          .header_primary_content {
            height: 87px;
            margin: 0 auto;
            width: 320px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-bottom: 1px solid var(--green-95);
          }
          header {
            height: 136px;
            box-shadow: 0 2px 4px rgba(0, 20, 19, 0.34),
              0 6px 8px rgba(0, 20, 19, 0.24), 0 16px 16px rgba(0, 20, 19, 0.14);
            background-color: var(--green-80);
            border-radius: 12px;
            border-bottom-right-radius: 4px;
            border-bottom-left-radius: 4px;
            box-sizing: border-box;
            padding-bottom: 15px;
            margin: 16px 0;
          }
          .primary_balance {
            color: #fff;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
            display: flex;
            align-self: center;
          }
          .loading_wrap {
            margin-top: 10px;
          }
          .total_balance_label {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            text-align: center;
            margin-bottom: 4px;
          }
          .top_money_sign {
            width: 12px;
            height: 24px;
            color: var(--green-40);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: center;
            margin-right: 4px;
          }
          .asset_name {
            margin-left: 8px;
          }
          .sub_info_row {
            display: flex;
            width: 320px;
            justify-content: space-between;
            margin: 0 auto;
            margin-top: 11px;
          }
          .info_left {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            text-align: center;
            margin-right: 8px;
          }
          .info_group_item {
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: center;
          }
          .panel_switcher {
            width: 100%;
          }
        `}
      </style>
    </>
  )
}
