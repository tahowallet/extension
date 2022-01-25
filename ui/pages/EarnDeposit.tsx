import React, { ReactElement, useState } from "react"
import { Link } from "react-router-dom"
import BackButton from "../components/Shared/SharedBackButton"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedButton from "../components/Shared/SharedButton"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import SharedAssetInput from "../components/Shared/SharedAssetInput"

export default function EarnDeposit(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <>
      <section className="primary_info">
        <BackButton />
        <header>
          <div className="left side_column">
            <div className="type">VAULT</div>
            <div className="content">
              <div>Estimated APR</div>
              <div>Total value locked</div>
              <div>Rewards</div>
            </div>
          </div>
          <div className="center">
            <SharedAssetIcon size="large" />
            <span className="asset_name">USDT</span>
          </div>
          <div className="right side_column">
            <div>
              <Link to="www.onet.pl" target="_blank">
                <div className="contract">
                  <div className="name">Contract</div>
                  <span className="external" />
                </div>
              </Link>
            </div>
            <div className="content data">
              <div>250%</div>
              <div>$20,283,219</div>
              <div className="rewards">
                <img className="lock" src="./images/lock@2.png" alt="Locked" />
                TALLY
              </div>
            </div>
          </div>
        </header>
      </section>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Deposit", "Withdraw", "Pool Info"]}
      />
      <div className="deposit_wrap">
        <SharedAssetInput
          label="Deposit asset"
          defaultAsset={{ symbol: "ETH", name: "Ether" }}
        />
        <SharedButton type="primary" size="large">
          Approve & Deposit
        </SharedButton>
      </div>
      <style jsx>
        {`
          .primary_info {
            margin-top: 15px;
            width: 90%;
          }
          .content {
            padding-top: 48px;
            font-size: 14px;
            line-height: 18px;
            display: flex;
            flex-flow: column;
            gap: 16px;
            margin-bottom: 12px;
            color: var(--green-40);
          }
          .content.data {
            color: white;
            align-items: flex-end;
            font-size: 18px;
          }
          .contract {
            display: flex;
            align-items: center;
            gap: 4px;
            justify-content: flex-end;
          }
          .name {
            text-decoration: none;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            height: 17px;
          }
          .external {
            mask-image: url("./images/external@2x.png");
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            background-color: var(--green-40);
          }
          header {
            width: 100%;
            margin: 0 auto;
            display: flex;
            padding: 0px 16px;
            box-sizing: border-box;
            justify-content: space-between;
            margin-bottom: 24px;
            border: 1px solid #33514e;
          }
          .asset_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-transform: uppercase;
            margin-top: 7px;
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
          .type {
            height: 17px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #a4cfff;
            background: #0b4789;
            font-size: 12px;
            padding: 0 4px;
            line-height: 16px;
            max-width: 40px;
          }
          .side_column {
            margin-top: 16px;
            color: #fff;
            font-size: 18px;
            font-weight: 600;
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
          .lock {
            width: 16px;
            display: inline-block;
          }
          .rewards {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            padding: 4px;
            background-color: var(--green-120);
          }
        `}
      </style>
    </>
  )
}
