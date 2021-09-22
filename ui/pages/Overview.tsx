import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../hooks"
import CorePage from "../components/Core/CorePage"
import OverviewAssetsTable from "../components/Overview/OverviewAssetsTable"

export default function Overview(): ReactElement {
  const { combinedData } = useBackgroundSelector(
    (background) => background.account
  )

  return (
    <CorePage hasTopBar={false}>
      <header>
        <div className="header_primary_content standard_width">
          <span className="total_balance_label">Total balance</span>
          <div className="primary_balance">
            <span className="primary_money_sign">$</span>
            {combinedData?.totalUserValue}
          </div>
        </div>
        <div className="sub_info_row">
          <div className="info_group_item">
            <span className="info_left">Addresses</span>4
          </div>
          <div className="info_group_item">
            <span className="info_left">Assets</span>
            23
          </div>
        </div>
      </header>
      <OverviewAssetsTable assets={combinedData?.assets} />
      <style jsx>
        {`
          .header_primary_content {
            height: 96px;
            box-shadow: 0 2px 4px rgba(0, 20, 19, 0.24),
              0 6px 8px rgba(0, 20, 19, 0.14), 0 16px 16px rgba(0, 20, 19, 0.04);
            background-color: #33514e;
            margin: 0 auto;
            border-bottom-right-radius: 12px;
            border-bottom-left-radius: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          header {
            width: 384px;
            height: 158px;
            box-shadow: 0 2px 4px rgba(0, 20, 19, 0.24),
              0 6px 8px rgba(0, 20, 19, 0.14), 0 16px 16px rgba(0, 20, 19, 0.04);
            background-color: var(--green-95);
          }
          .primary_balance {
            color: #fff;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
            display: flex;
            align-self: center;
          }
          .total_balance_label {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            text-align: center;
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
            margin-top: 17px;
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
    </CorePage>
  )
}
