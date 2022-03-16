import {
  AvailableVault,
  selectAvailableVaults,
  selectLockedValues,
  selectTotalLockedValue,
  updateEarnedOnDepositedPools,
  updateLockedValues,
} from "@tallyho/tally-background/redux-slices/earn"

import React, { ReactElement, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

type EarnCardProps = {
  vault: AvailableVault
}

function EarnCard({ vault }: EarnCardProps) {
  const lockedValues = useBackgroundSelector(selectLockedValues)
  const currentVault = lockedValues.find(
    (lockedValue) => lockedValue.vaultAddress === vault?.contractAddress
  )

  return (
    <Link
      to={{
        pathname: "/earn/deposit",
        state: {
          vault,
        },
      }}
      className="earn"
    >
      <div className="card">
        <div className="asset_icon_wrap">
          <SharedAssetIcon size="large" symbol={vault?.symbol} />
        </div>
        <span className="token_name">{vault?.symbol}</span>
        <span className="apy_info_label">Estimated APR</span>
        <span className="apy_percent">250%</span>
        <div className="divider" />
        <div className="info">
          <div className="label">TVL</div>
          <div className="tvl">${Number(currentVault?.lockedValue)}</div>
        </div>
        <div className="divider" />
        <div className="info">
          <div className="label">Reward</div>
          <div className="rewards">
            <img className="lock" src="./images/lock@2.png" alt="Locked" />
            TALLY
          </div>
        </div>
        <style jsx>{`
          .card {
            width: 160px;
            height: 266px;
            border-radius: 8px;
            flex-shrink: 0;
            display: flex;
            background: linear-gradient(var(--green-95) 100%, var(--green-95));
            flex-direction: column;
            align-items: center;
            margin-top: 26px;
            margin-bottom: 16px;
            transition: all 0.2s ease;
          }
          .card:hover {
            box-shadow: 0px 10px 12px 0px #0014138a;
            background: linear-gradient(180deg, #284340 0%, #193330 100%);
          }
          .tvl {
            font-size: 18px;
            font-weight: bold;
          }
          .info {
            display: flex;
            flex-flow: column;
            padding: 8px 0;
            gap: 4px;
            justify-content: center;
            align-items: center;
            color: white;
          }
          .rewards {
            display: flex;
            align-items: center;
            border-radius: 4px;
            padding: 4px;
            background-color: var(--hunter-green);
          }
          .asset_icon_wrap {
            border: solid var(--green-95) 3px;
            border-radius: 500px;
            margin-top: -18px;
          }
          .token_name {
            font-weight: bold;
            color: white;
            font-size: 18px;
            font-weight: 500;
            line-height: 24px;
            text-transform: uppercase;
            margin-top: 3px;
            margin-bottom: 4px;
          }
          .lock {
            height: 13px;
            margin-right: 4px;
            display: inline-block;
          }
          .apy_info_label {
            color: var(--green-40);
            font-size: 14px;
            line-height: 17px;
            margin-bottom: -4px;
          }
          .apy_percent {
            color: var(--success);
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
          }
        `}</style>
      </div>
    </Link>
  )
}

export default function Earn(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  const dispatch = useBackgroundDispatch()
  const availableVaults = useBackgroundSelector(selectAvailableVaults)
  const totalTVL = useBackgroundSelector(selectTotalLockedValue)

  useEffect(() => {
    dispatch(updateEarnedOnDepositedPools())
    dispatch(updateLockedValues())
  }, [dispatch])

  return (
    <>
      <header>
        <div className="left">
          <div className="pre_title">Total value locked</div>
          <div className="balance">
            <span className="currency_sign">$</span>
            {totalTVL || "0"}
          </div>
        </div>
        <div className="right" />
      </header>
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Vaults", "LP Pools", "Your deposits"]}
      />
      {panelNumber === 0 ? (
        <section className="standard_width">
          <ul className="cards_wrap">
            {availableVaults?.map((vault) => (
              <li>
                <EarnCard vault={vault} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <></>
      )}
      {panelNumber === 1 ? (
        <section className="standard_width">
          <p>Coming soon</p>
        </section>
      ) : (
        <></>
      )}
      <style jsx>
        {`
          .cards_wrap {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-around;
            margin-top: 12px;
          }
          .pre_title {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            margin-bottom: 7px;
          }
          .currency_sign {
            color: var(--green-40);
            font-size: 18px;
          }
          .balance {
            display: flex;
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
            background-size: cover;
            overflow: visible;
            padding: 17px 16px 96px 16px;
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
