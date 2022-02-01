import React, { ReactElement, useState } from "react"
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
        <div className="wrapper">
          <div className="row">
            <div className="type">VAULT</div>
            <div className="center">
              <SharedAssetIcon size="large" />
              <span className="asset_name">USDT</span>
            </div>
            <div>
              <a href="www.onet.pl" target="_blank">
                <div className="contract">
                  <div className="contract_link">Contract</div>
                  <span className="external" />
                </div>
              </a>
            </div>
          </div>
          <div className="row">
            <div className="label">Estimated APR</div>
            <div className="amount">250%</div>
          </div>
          <div className="row">
            <div className="label">Total value locked</div>
            <div className="amount">$20,283,219</div>
          </div>
          <div className="row">
            <div className="label">Rewards</div>
            <div className="rewards">
              <img className="lock" src="./images/lock@2.png" alt="Locked" />
              TALLY
            </div>
          </div>
        </div>
        <div className="wrapper">
          <div className="row">
            <div className="label">Deposited amount</div>
            <div className="amount">
              27,834 <span className="token">Curve ibGBP</span>
            </div>
          </div>
          <div className="divider" />
          <div className="row">
            <div className="label">Available rewards</div>
            <div className="amount">
              27,834 <span className="token">TALLY</span>
            </div>
          </div>
          <div className="row claim">
            <img
              className="receive_icon"
              src="./images/receive@2x.png"
              alt=""
            />
            Claim rewards
          </div>
        </div>
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
        <div className="confirm">
          <SharedButton type="primary" size="large">
            Approve
          </SharedButton>
        </div>
      </div>
      <style jsx>
        {`
          .primary_info {
            margin-top: 15px;
            width: 90%;
          }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .row.claim {
            justify-content: flex-end;
            color: var(--trophy-gold);
            font-weight: bold;
            cursor: pointer;
          }
          .receive_icon {
            mask-size: 10px 10px;
            height: 10px;
            width: 10px;
            mask-image: url("./images/receive@2x.png");
            margin-right: 4px;
            background-color: var(--trophy-gold);
          }
          .token {
            font-size: 14px;
          }
          .divider {
            height: 1px;
            background-color: #33514e;
          }
          .amount {
            font-size: 18px;
            font-weight: 500;
          }
          .label {
            color: var(--green-40);
            font-size: 14px;
          }
          .contract {
            display: flex;
            align-items: center;
            gap: 4px;
            justify-content: flex-end;
          }
          .contract_link {
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
          .wrapper {
            width: 100%;
            margin: 0 auto;
            display: flex;
            flex-flow: column;
            box-sizing: border-box;
            padding: 12px 16px;
            gap: 12px;
            border: 1px solid #33514e;
            margin-bottom: 16px;
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
            margin-top: -36px;
            position: relative;
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
          .deposit_wrap {
            margin-top: 20px;
            height: 154px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .confirm {
            padding: 16px;
          }
          .lock {
            height: 13px;
            padding-right: 4px;
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
