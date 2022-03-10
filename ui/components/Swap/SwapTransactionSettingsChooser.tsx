import {
  NetworkFeeSettings,
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
  setFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"

import React, { ReactElement, useState } from "react"
import { SWAP_FEE } from "@tallyho/tally-background/redux-slices/0x-swap"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NetworkSettingsSelect from "../NetworkFees/NetworkSettingsSelect"
import FeeSettingsText from "../NetworkFees/FeeSettingsText"

export type SwapTransactionSettings = {
  slippageTolerance: number
  networkSettings: NetworkFeeSettings
}

interface SwapTransactionSettingsProps {
  isSettingsLocked?: boolean
  swapTransactionSettings: SwapTransactionSettings
  onSwapTransactionSettingsSave?: (setting: SwapTransactionSettings) => void
}

export default function SwapTransactionSettingsChooser({
  isSettingsLocked,
  swapTransactionSettings,
  onSwapTransactionSettingsSave,
}: SwapTransactionSettingsProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const [networkSettings, setNetworkSettings] = useState(
    useBackgroundSelector(selectDefaultNetworkFeeSettings)
  )

  const [isSlideUpMenuOpen, setIsSlideUpMenuOpen] = useState(false)

  const openSettings = () => {
    if (!isSettingsLocked) {
      setIsSlideUpMenuOpen(true)
    }
  }

  const saveSettings = () => {
    dispatch(setFeeType(networkSettings.feeType))

    onSwapTransactionSettingsSave?.({
      ...swapTransactionSettings,
      slippageTolerance: 0.01,
      networkSettings,
    })

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
                <NetworkSettingsSelect
                  estimatedFeesPerGas={estimatedFeesPerGas}
                  networkSettings={networkSettings}
                  onNetworkSettingsChange={setNetworkSettings}
                />
              </div>
              <div className="row">
                <div className="confirm">
                  <SharedButton
                    size="medium"
                    type="primary"
                    onClick={saveSettings}
                  >
                    Save
                  </SharedButton>
                </div>
              </div>
            </div>
          </SharedSlideUpMenu>

          <div className="top_label label">
            <label htmlFor="open-settings">Transaction settings</label>
            <button type="button" id="open-settings" onClick={openSettings}>
              <span className="icon_cog" />
            </button>
          </div>
        </>
      )}
      <div className="labels_wrap standard_width">
        <span className="label">
          Slippage tolerance
          <div className="info">
            {swapTransactionSettings.slippageTolerance * 100}%
          </div>
        </span>
        <span className="label">
          Estimated network fee
          <FeeSettingsText />
        </span>
        <span className="label">
          Tally Ho fee for the DAO
          <div className="info">{SWAP_FEE * 100}%</div>
        </span>
      </div>
      <style jsx>
        {`
          .labels_wrap {
            border-radius: 4px;
            background-color: var(--green-95);
            padding: 16px;
            box-sizing: border-box;
          }
          .top_label {
            margin-bottom: 7px;
          }
          .top_label label {
            flex-grow: 2;
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
