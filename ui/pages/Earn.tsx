import {
  clearInput,
  selectIsVaultDataStale,
} from "@tallyho/tally-background/redux-slices/earn"
import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { selectMainCurrencySymbol } from "@tallyho/tally-background/redux-slices/selectors"
import { DOGGO, EarnStages } from "@tallyho/tally-background/constants"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"

import React, { ReactElement, useEffect, useState } from "react"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import EarnDepositedCard from "./Earn/DepositCard"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import EmptyBowl from "../components/Earn/EmptyBowl"
import SharedSkeletonLoader from "../components/Shared/SharedSkeletonLoader"
import { useAllEarnVaults } from "../hooks/earn-hooks"
import HeaderTVL from "./Earn/HeaderTVL"
import PoolCard from "./Earn/PoolCard"
import HeaderComingSoon from "./Earn/HeaderComingSoon"
import HeaderDeploy from "./Earn/HeaderDeploy"
import NotificationVaults from "./Earn/NotificationVaults"

export default function Earn(): ReactElement {
  const isValutDataStale = useBackgroundSelector(selectIsVaultDataStale)
  const [panelNumber, setPanelNumber] = useState(0)
  const vaultsWithLockedValues = useAllEarnVaults()

  const dispatch = useBackgroundDispatch()
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)

  const [stage] = useState(EarnStages.Live) // TODO

  useEffect(() => {
    dispatch(clearInput()) // clear deposit amount input to start fresh after selecting any vault
  }, [dispatch])

  const totalTVL = vaultsWithLockedValues
    ?.map((item) => {
      return typeof item.numberValueTotalDeposited !== "undefined"
        ? item.numberValueTotalDeposited
        : 0
    })
    .reduce((prev, curr) => prev + curr, 0)

  const userTVL = vaultsWithLockedValues
    ?.map((item) => {
      return typeof item.numberValueUserDeposited !== "undefined"
        ? item.numberValueUserDeposited
        : 0
    })
    .reduce((prev, curr) => prev + curr, 0)

  const userPendingRewards = vaultsWithLockedValues
    ?.map((item) => {
      return fromFixedPointNumber(
        { amount: item.pendingRewards, decimals: DOGGO.decimals },
        2
      )
    })
    .reduce((prev, curr) => prev + curr, 0)
    .toFixed(2)

  const depositedVaults =
    vaultsWithLockedValues?.filter((vault) => vault.userDeposited > 0n) ?? []

  return (
    <>
      {stage === EarnStages.ComingSoon && <HeaderComingSoon />}
      {stage === EarnStages.Deploying && <HeaderDeploy />}
      {stage !== EarnStages.ComingSoon && stage !== EarnStages.Deploying && (
        <HeaderTVL
          balance={formatCurrencyAmount(mainCurrencySymbol, totalTVL || 0, 2)}
        />
      )}
      <SharedPanelSwitcher
        setPanelNumber={setPanelNumber}
        panelNumber={panelNumber}
        panelNames={["Pools", "Your deposits"]}
      />
      {panelNumber === 0 ? (
        <section className="standard_width">
          {stage === EarnStages.PartialyLive && <NotificationVaults />}
          <ul className="cards_wrap">
            {/* TODO Replace isComing soon with a check if current Timestamp > vault.poolStartTime */}
            {vaultsWithLockedValues?.map((vault) => (
              <PoolCard vault={vault} />
            ))}
          </ul>
        </section>
      ) : (
        <></>
      )}
      {panelNumber === 1 &&
        (isValutDataStale || depositedVaults.length > 0 ? (
          <section className="standard_width">
            <div className="your_deposit_heading_info">
              <div className="left">
                <div className="label">Total deposits</div>
                <SharedSkeletonLoader isLoaded={!isValutDataStale} height={24}>
                  <div className="amount">
                    ${formatCurrencyAmount(mainCurrencySymbol, userTVL || 0, 2)}
                  </div>
                </SharedSkeletonLoader>
              </div>
              <div className="right">
                <div className="label">Total available rewards</div>
                <SharedSkeletonLoader isLoaded={!isValutDataStale} height={24}>
                  <div className="amount">{userPendingRewards} DOGGO</div>
                </SharedSkeletonLoader>
              </div>
            </div>
            <SharedSkeletonLoader
              isLoaded={!isValutDataStale}
              height={176}
              customStyles={`
                margin-top: 40px;
              `}
            >
              <ul className="cards_wrap">
                {depositedVaults?.map((vault) => (
                  <EarnDepositedCard vault={vault} />
                ))}
              </ul>
            </SharedSkeletonLoader>
          </section>
        ) : (
          <EmptyBowl />
        ))}
      <style jsx>
        {`
          .cards_wrap {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-around;
            margin-top: 12px;
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
        `}
      </style>
    </>
  )
}
