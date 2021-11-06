import React, { ReactElement, useState } from "react"
import CorePage from "../components/Core/CorePage"
import BackButton from "../components/Shared/SharedBackButton"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedButton from "../components/Shared/SharedButton"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import SharedAssetInput from "../components/Shared/SharedAssetInput"

export default function EarnDeposit(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <>
      <CorePage>
        <section className="primary_info">
          <BackButton />
          <header>
            <div className="left side_column">
              <div className="side_title">Reward</div>
              <span className="reward_wrap">
                <div className="icon_reward" />
                TALLY
              </span>
            </div>
            <div className="center">
              <SharedAssetIcon size="large" />
              <span className="asset_name">USDT</span>
            </div>
            <div className="right side_column">
              <div className="side_title">est. APR</div>
              250%
            </div>
          </header>
        </section>
        <SharedPanelSwitcher
          setPanelNumber={setPanelNumber}
          panelNumber={panelNumber}
          panelNames={["Deposit", "Withdraw", "Risk"]}
        />
        <div className="deposit_wrap">
          <SharedAssetInput
            label="Deposit amount"
            defaultToken={{ symbol: "ETH", name: "Ether" }}
          />
          <SharedButton type="primary" size="large">
            Approve & Deposit
          </SharedButton>
        </div>
      </CorePage>
      <style jsx>
        {`
          .primary_info {
            margin-top: 15px;
          }
          header {
            width: 100%;
            height: 89px;
            background-color: var(--green-95);
            display: flex;
            padding: 0px 16px;
            box-sizing: border-box;
            justify-content: space-between;
            margin-bottom: 23px;
          }
          .asset_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-transform: uppercase;
            nargin-top: 7px;
          }
          .center {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: -26px;
            position: absolute;
            left: 0px;
            right: 0px;
            pointer-events: none;
          }
          .side_title {
            margin-top: 16px;
            height: 17px;
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
          }
          .side_column {
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .right {
            text-align: right;
          }
          .deposit_wrap {
            margin-top: 20px;
            height: 154px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .reward_wrap {
            display: flex;
            align-content: flex-start;
          }
          .icon_reward {
            background: url("./images/tally_reward@2x.png");
            background-size: cover;
            width: 24px;
            height: 24px;
            margin-right: 8px;
            margin-top: 2px;
          }
        `}
      </style>
    </>
  )
}
