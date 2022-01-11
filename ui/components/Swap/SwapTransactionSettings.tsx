import {
  NetworkFeeSetting,
  selectEstimatedFeesPerGas,
  setFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"

import React, { ReactElement, useState } from "react"
import { useDispatch } from "react-redux"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundSelector } from "../../hooks"
import SwapSettingsChooser from "../NetworkFees/SwapSettingsChooser"

interface SwapTransactionSettingsProps {
  isSettingsLocked?: boolean
}

export default function SwapTransactionSettings(
  props: SwapTransactionSettingsProps
): ReactElement {
  const { isSettingsLocked } = props
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const [isSlideUpMenuOpen, setIsSlideUpMenuOpen] = useState(false)
  const [gasLimit, setGasLimit] = useState("")
  const dispatch = useDispatch()

  function openSettings() {
    if (!isSettingsLocked) {
      setIsSlideUpMenuOpen(true)
    }
  }

  // TODO pass proper gas to SwapSettingsChooser to display real fees

  const networkSettingsSaved = (networkSetting: NetworkFeeSetting) => {
    dispatch(setFeeType(networkSetting.feeType))
    setIsSlideUpMenuOpen(false)
  }

  return (
    <>
      {isSettingsLocked ? (
        <div className="top_label label">Transaction settings</div>
      ) : (
        <>
          <SharedSlideUpMenu
            isOpen={isSlideUpMenuOpen}
            size="large"
            close={() => {
              setIsSlideUpMenuOpen(false)
            }}
          >
            <div className="settings_wrap">
              <div className="row row_slippage">
                <span className="settings_label">Slippage tolerance</span>
                <SharedButton type="secondary" size="medium" icon="chevron">
                  1%
                </SharedButton>
              </div>
              <div className="row row_fee">
                <span className="settings_label settings_label_fee">
                  Transaction Fee/Speed
                </span>

                <SwapSettingsChooser
                  networkSettings={{
                    estimatedFeesPerGas,
                    gasLimit,
                  }}
                  onNetworkSettingsSave={networkSettingsSaved}
                  visible={isSlideUpMenuOpen}
                />
              </div>
            </div>
          </SharedSlideUpMenu>

          <div className="top_label label">
            Transaction settings
            <button type="button" onClick={openSettings}>
              <span className="icon_cog" />
            </button>
          </div>
        </>
      )}
      <div className="labels_wrap standard_width">
        <span className="label">
          Slippage tolerance
          <div className="info">1%</div>
        </span>
        <span className="label">
          Network Fee/Speed
          <div className="info">{"$24 / Fast <1min"}</div>
        </span>
      </div>
      <style jsx>
        {`
          .labels_wrap {
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            padding: 16px;
            box-sizing: border-box;
          }
          .top_label {
            margin-bottom: 7px;
          }
          .row {
            padding: 15px 0px;
            display: flex;
            align-items: center;
          }
          .row_slippage {
            display: flex;
            justify-content: space-between;
            padding-bottom: 8px;
          }
          .row_fee {
            flex-direction: column;
            align-items: flex-start;
          }
          .settings_label {
            height: 17px;
            color: var(--green-40);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .settings_label_fee {
            margin-bottom: 7px;
          }
          .icon_cog {
            display: block;
            mask-image: url("./images/cog@2x.png");
            mask-size: cover;
            width: 12px;
            height: 12px;
            background-color: var(--green-60);
          }
          .icon_cog:hover {
            background-color: #fff;
          }
          .settings_wrap {
            width: 384px;
            margin-top: 36px;
            padding: 0px 17px;
            box-sizing: border-box;
            background-color: var(--green-95);
          }
          .label:first-of-type {
            margin-bottom: 7px;
          }
          .info {
            color: var(--green-20);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-align: right;
          }
          .label {
            margin-bottom: 5px;
          }
        `}
      </style>
    </>
  )
}
