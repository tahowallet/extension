import React, { ReactElement } from "react"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedButton from "../components/Shared/SharedButton"

function EarnCard() {
  return (
    <div className="card">
      <div className="asset_icon_wrap">
        <SharedAssetIcon />
      </div>
      <span className="token_name">ETH</span>
      <span className="apy_info_label">Current APY</span>
      <span className="apy_percent">250%</span>
      <div className="icon_rewards_locked" />
      <div className="divider" />

      <SharedButton type="secondary" size="medium" linkTo="/earn/deposit">
        Deposit
      </SharedButton>
      <style jsx>{`
        .card {
          width: 160px;
          height: 266px;
          border-radius: 8px;
          background-color: var(--green-95);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 18px;
        }
        .asset_icon_wrap {
          border: solid var(--green-95) 3px;
          border-radius: 500px;
          margin-top: -18px;
        }
        .token_name {
          color: var(--green-20);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          text-transform: uppercase;
          margin-top: 3px;
          margin-bottom: 4px;
        }
        .apy_info_label {
          color: var(--green-40);
          font-size: 14px;
          line-height: 17px;
          margin-bottom: -4px;
        }
        .apy_percent {
          color: #11bea9;
          font-family: "Quincy CF";
          font-size: 36px;
          font-weight: 500;
          line-height: 42px;
          text-align: center;
          margin-bottom: 4px;
        }
        .icon_rewards_locked {
          background: url("./images/reward_locked@2x.png") center no-repeat;
          background-size: cover;
          width: 51px;
          height: 58px;
          margin-bottom: 13px;
          margin-top: 2px;
        }
        .divider {
          width: 128px;
          border-bottom: 1px solid var(--green-120);
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  )
}

export default function Earn(): ReactElement {
  return (
    <>
      <header>
        <div className="left">
          <div className="pre_title">Total value locked</div>
          <div className="balance">23,928,292</div>
        </div>
        <div className="right">
          <div className="pre_title">24h Change</div>
          <div className="percentage">+12%</div>
        </div>
      </header>
      <section className="standard_width">
        <h3>Your deposits</h3>
        <div className="cards_wrap">{Array(2).fill("").map(EarnCard)}</div>
      </section>
      <section className="standard_width">
        <h3>Earn</h3>
        <div className="cards_wrap">{Array(2).fill("").map(EarnCard)}</div>
      </section>
      <style jsx>
        {`
          h3 {
            color: var(--green-40);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .cards_wrap {
            display: flex;
            justify-content: space-between;
            margin-top: -10px;
          }
          .pre_title {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            margin-bottom: 7px;
          }
          .balance {
            text-shadow: 0 2px 2px #072926;
            color: #fff;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
          }
          .percentage {
            color: #11bea9;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: right;
          }
          header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            background: url("./images/graph@2x.png") center no-repeat;
            background-size: cover;
            overflow: visible;
            padding: 17px 16px 76px 16px;
            box-sizing: border-box;
            align-items: flex-start;
            margin-bottom: -65px;
          }
          .right {
            display: flex;
            justify-content: flex-end;
            flex-direction: column;
          }
        `}
      </style>
    </>
  )
}
