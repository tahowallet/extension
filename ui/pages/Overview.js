import React from "react"
import { registerRoute } from "../config/routes"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"

import CorePage from "../components/Core/CorePage"

export default function Overview() {
  return (
    <>
      <CorePage hasTopBar={false}>
        <div className="header">
          <div className="header_top">
            <div className="prelabel">Total balance</div>
            <div className="balance">
              <span className="money_sign">$</span>11,235,382
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
        </div>
        <div className="column_names">
          <div className="column_one">Asset</div>
          <div className="column_two">Price</div>
          <div className="column_three">Price</div>
        </div>
        <div className="table">
          {Array(6)
            .fill("")
            .map(() => (
              <div className="row">
                <div className="asset">
                  <SharedAssetIcon size="small" />
                  <span className="asset_name">KEEP</span>
                </div>
                <div className="price">
                  <span className="lighter_color">$</span>0.02827
                </div>
                <div className="row_balance">
                  <span className="lighter_color">$</span>48,455
                </div>
              </div>
            ))}
        </div>
      </CorePage>
      <style jsx>
        {`
          .header_top {
            width: 352px;
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
            align-itens: center;
            align-content: center;
            text-align: center;
          }
          .header {
            width: 384px;
            height: 158px;
            box-shadow: 0 2px 4px rgba(0, 20, 19, 0.24),
              0 6px 8px rgba(0, 20, 19, 0.14), 0 16px 16px rgba(0, 20, 19, 0.04);
            background-color: var(--green-95);
          }
          .balance {
            color: #fff;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
            display: flex;
            align-self: center;
          }
          .row {
            display: flex;
            justify-content: space-between;
            width: 352px;
            align-items: center;
            border-bottom: 1px solid var(--green-120);
            padding: 11px 0px;
          }
          .asset {
            display: flex;
            align-items: center;
          }
          .column_names {
            width: 352px;
            display: flex;
            color: var(--green-60);
            font-size: 12px;
            font-weight: 600;
            line-height: 16px;
            margin: 0 auto;
            margin-top: 23px;
            border-bottom: 1px solid var(--green-120);
            padding-bottom: 8px;
          }
          .column_one {
            margin-right: 161px;
          }
          .column_two {
            margin-right: 104px;
          }
          .column_three {
            align-self: flex-end;
            justify-self: flex-end;
          }
          .prelabel {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            text-align: center;
          }
          .money_sign {
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
          .lighter_color {
            color: var(--green-60);
          }
        `}
      </style>
    </>
  )
}

registerRoute("overview", Overview)
