import React, { ReactElement } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../hooks"
import OverviewAssetsTable from "../components/Overview/OverviewAssetsTable"
import SharedLoadingSpinner from "../components/Shared/SharedLoadingSpinner"

export default function Overview(): ReactElement {
  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const { initializationLoadingTimeExpired, numberOfAddresses } =
    useBackgroundSelector((background) => {
      return {
        numberOfAddresses: Object.keys(background.account.accountsData).length,
        initializationLoadingTimeExpired:
          background.ui?.initializationLoadingTimeExpired,
      }
    })

  return (
    <>
      <header className="standard_width">
        <div className="header_primary_content">
          <span className="total_balance_label">Total balance</span>
          <div className="primary_balance">
            {initializationLoadingTimeExpired ||
            combinedData?.totalMainCurrencyValue ? (
              <>
                <span className="primary_money_sign">$</span>
                {combinedData?.totalMainCurrencyValue}
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
            <span className="info_left">Addresses</span>
            {numberOfAddresses}
          </div>
          <div className="info_group_item">
            <span className="info_left">Assets</span>
            {combinedData.assets.length}
          </div>
        </div>
      </header>
      <OverviewAssetsTable
        assets={combinedData.assets}
        initializationLoadingTimeExpired={initializationLoadingTimeExpired}
      />
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
            margin-top: 16px;
            margin-bottom: -6px;
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
        `}
      </style>
    </>
  )
}
