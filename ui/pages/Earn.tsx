import {
  AvailableVault,
  selectEnrichedAvailableVaults,
  updateEarnedValues,
  updateLockedValues,
} from "@tallyho/tally-background/redux-slices/earn"
import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { selectMainCurrencySymbol } from "@tallyho/tally-background/redux-slices/selectors"
import { doggoTokenDecimalDigits } from "@tallyho/tally-background/constants"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"

import React, { ReactElement, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import classNames from "classnames"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import EarnDepositedCard from "../components/Earn/EarnDepositedCard"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

type EarnCardProps = {
  vault: AvailableVault & {
    localValueTotalDeposited: string | undefined
    localValueUserDeposited: string | undefined
  }
  isComingSoon: boolean
}

function EarnCard({ vault, isComingSoon }: EarnCardProps) {
  return (
    <Link
      to={{
        pathname: "/earn/deposit",
        state: {
          vaultAddress: vault.vaultAddress,
        },
      }}
      className="earn"
    >
      <div className={classNames("card", { coming_soon: isComingSoon })}>
        <div className="asset_icon_wrap">
          <SharedAssetIcon size="large" symbol={vault?.asset?.symbol} />
        </div>
        <span className="token_name">{vault?.asset?.symbol}</span>
        <span className="apy_info_label">Estimated APR</span>
        <span className="apy_percent">250%</span>
        <div className="divider" />
        <div className="info">
          <div className="label">TVL</div>
          <div className="tvl">${vault.localValueTotalDeposited ?? 0}</div>
        </div>
        <div className="divider" />
        <div className="info">
          <div className="label">Reward</div>
          <div className="rewards">
            <img className="lock" src="./images/lock@2.png" alt="Locked" />
            TALLY
          </div>
        </div>
        {isComingSoon && <div className="coming_soon_notice">Coming soon</div>}
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
          .coming_soon_notice {
            color: var(--attention);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            margin-top: -140px;
          }
          .coming_soon
            > *:not(.asset_icon_wrap, .token_name, .coming_soon_notice) {
            opacity: 0.1;
          }
        `}</style>
      </div>
    </Link>
  )
}

export default function Earn(): ReactElement {
  const [panelNumber, setPanelNumber] = useState(0)

  const dispatch = useBackgroundDispatch()

  const vaultsWithMainCurrencyValues = useBackgroundSelector(
    selectEnrichedAvailableVaults
  )

  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)

  const isComingSoon = false

  useEffect(() => {
    dispatch(updateLockedValues())
    dispatch(updateEarnedValues())
  }, [dispatch])

  const totalTVL = vaultsWithMainCurrencyValues
    .map((item) => {
      return typeof item.numberValueTotalDeposited !== "undefined"
        ? item.numberValueTotalDeposited
        : 0
    })
    .reduce((prev, curr) => prev + curr, 0)

  const userTVL = vaultsWithMainCurrencyValues
    .map((item) => {
      return typeof item.numberValueUserDeposited !== "undefined"
        ? item.numberValueUserDeposited
        : 0
    })
    .reduce((prev, curr) => prev + curr, 0)

  const userPendingRewards = vaultsWithMainCurrencyValues
    .map((item) => {
      return fromFixedPointNumber(
        { amount: item.pendingRewards, decimals: doggoTokenDecimalDigits },
        2
      )
    })
    .reduce((prev, curr) => prev + curr, 0)

  return (
    <>
      {isComingSoon ? (
        <header className="coming_soon_header">
          <div className="left">
            <div className="serif_header">Time left till launch</div>
          </div>
          <div className="right clock">
            <div className="time_segment">
              <div className="serif_header number">2</div>
              <div className="time_label">Days</div>
            </div>
            <div className="time_segment">
              <div className="serif_header number">14</div>
              <div className="time_label">Hours</div>
            </div>
          </div>
        </header>
      ) : (
        <header>
          <div className="left">
            <div className="pre_title">Total value locked</div>
            <div className="balance">
              <span className="currency_sign">$</span>
              {formatCurrencyAmount(mainCurrencySymbol, totalTVL, 2)}
            </div>
          </div>
          <div className="right" />
        </header>
      )}
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Vaults", "LP Pools", "Your deposits"]}
      />
      {panelNumber === 0 ? (
        <section className="standard_width">
          <ul className="cards_wrap">
            {vaultsWithMainCurrencyValues?.map((vault) => (
              <li>
                <EarnCard vault={vault} isComingSoon={!vault.active} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <></>
      )}
      {panelNumber === 1 ? (
        <section className="standard_width lp_pool_panel_wrap">
          <div className="bone_illustration" />
          <div className="serif_header">In training</div>
          <div className="label">coming soon</div>
        </section>
      ) : (
        <></>
      )}
      {panelNumber === 2 ? (
        <section className="standard_width">
          <div className="your_deposit_heading_info">
            <div className="left">
              <div className="label">Total deposits</div>
              <div className="amount">
                ${formatCurrencyAmount(mainCurrencySymbol, userTVL, 2)}
              </div>
            </div>
            <div className="right">
              <div className="label">Total available rewards</div>
              <div className="amount">{userPendingRewards} DOGGO</div>
            </div>
          </div>
          <ul className="cards_wrap">
            {vaultsWithMainCurrencyValues.map((vault) => (
              <li>
                <EarnDepositedCard
                  vaultAddress={vault.vaultAddress}
                  asset={vault.asset}
                  depositedAmount={vault.numberValueUserDeposited || 0}
                  availableRewards={fromFixedPointNumber(
                    {
                      amount: vault.pendingRewards,
                      decimals: doggoTokenDecimalDigits,
                    },
                    2
                  )}
                />
              </li>
            ))}
          </ul>
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
          .your_deposit_heading_info {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
          }
          .your_deposit_heading_info .amount {
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .your_deposit_heading_info .label {
            font-size: 14px;
            font-weight: 500;
            line-height: 16px;
            margin-bottom: 6px;
          }
          .your_deposit_heading_info .right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .serif_header {
            color: var(--trophy-gold);
          }
          .bone_illustration {
            background: url("./images/illustration_bones@2x.png");
            background-size: cover;
            width: 106px;
            height: 101px;
            margin-bottom: 16px;
          }
          .lp_pool_panel_wrap {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin-top: 46px;
          }
          .coming_soon_header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: -110px;
            margin-top: -50px;
          }
          .coming_soon_header .left {
            width: 166px;
          }
          .coming_soon_header .right {
            display: flex;
            flex-direction: row;
            width: 161px;
            grid-gap: 3px;
          }
          .time_segment {
            width: 55px;
            text-align: center;
            padding: 0px 13px;
          }
          .clock {
            background: url("./images/clock_bg@2x.png");
            background-size: cover;
            width: 206px;
            height: 139px;
            flex-shrink: 0;
            flex-grow: 1;
            margin-top: 40px;
          }
          .number {
            color: var(--success);
            font-size: 60px;
            font-weight: 500;
            line-height: 42px;
            text-align: center;
            margin-top: 19px;
          }
          .time_label {
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            font-weight: 400;
            line-height: 16px;
            text-align: center;
          }
          .left .serif_header {
            font-size: 36px;
            line-height: 42px;
          }
        `}
      </style>
    </>
  )
}
