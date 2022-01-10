import {
  EstimatedFeesPerGas,
  NetworkFeeSetting,
  NetworkFeeTypeChosen,
  selectFeeType,
  selectLastGasEstimatesRefreshTime,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import NetworkSettingsSelect from "./NetworkSettingsSelect"

interface NetworkSettingsChooserProps {
  networkSettings: {
    estimatedFeesPerGas: EstimatedFeesPerGas | undefined
    gasLimit: string
  }
  onNetworkSettingsSave: (setting: NetworkFeeSetting) => void
  visible: boolean
}

export default function SwapSettingsChooser({
  networkSettings: { estimatedFeesPerGas, gasLimit },
  onNetworkSettingsSave,
  visible,
}: NetworkSettingsChooserProps): ReactElement {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [customGasLimit, setCustomGasLimit] = useState(gasLimit)
  const [selectedSetting, setSelectedSetting] = useState({
    feeType: NetworkFeeTypeChosen.Regular,
    gasLimit: "",
    values: {
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
    },
  })

  const gasTime = useBackgroundSelector(selectLastGasEstimatesRefreshTime)
  const selectedFeeType = useBackgroundSelector(selectFeeType)

  const saveUserGasChoice = () => {
    onNetworkSettingsSave(selectedSetting)
  }

  const getSecondsTillGasUpdate = useCallback(() => {
    const now = new Date().getTime()
    setTimeRemaining(Number((120 - (now - gasTime) / 1000).toFixed()))
  }, [gasTime])

  useEffect(() => {
    getSecondsTillGasUpdate()
    const interval = setTimeout(getSecondsTillGasUpdate, 1000)
    return () => {
      clearTimeout(interval)
    }
  })

  return (
    <>
      <div className="wrapper">
        <div className="fees standard_width">
          <div className="divider">
            <div className="divider-background" />
            <div
              className="divider-cover"
              style={{ left: -384 + (384 - timeRemaining * (384 / 120)) }}
            />
          </div>
          {visible ? (
            <NetworkSettingsSelect
              estimatedFeesPerGas={estimatedFeesPerGas}
              gasLimit={customGasLimit}
              setCustomGasLimit={setCustomGasLimit}
              onSelectNetworkSetting={setSelectedSetting}
              selectedFeeType={selectedFeeType}
            />
          ) : (
            <></>
          )}
        </div>
        <div className="confirm">
          <SharedButton
            size="medium"
            type="primary"
            onClick={saveUserGasChoice}
          >
            Save
          </SharedButton>
        </div>
      </div>

      <style jsx>
        {`
          .wrapper {
            height: 100%;
            margin: 0 auto;
            display: flex;
            flex-flow: column;
            justify-content: space-between;
          }
          .fees {
            background-color: var(--green-95);
            margin: 0 auto;
            display: flex;
            flex-flow: column;
          }
          .divider {
            border-radius: 4px;
            height: 2px;
            width: 384px;
            position: relative;
            left: -16px;
            margin: 12px 0;
          }
          .divider-cover {
            background: #667c7a;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            position: absolute;
            transition: all 0.3s ease;
          }
          .divider-background {
            background: #33514e;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            position: absolute;
            transition: all 0.3s ease;
          }
          .network_fee {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            line-height: 16px;
            color: var(--green-40);
            margin-bottom: 12px;
          }
          .confirm {
            background-color: var(--hunter-green);
            width: 100%;
            display: flex;
            position: absolute;
            bottom: 0;
            right: 0;
            box-sizing: border-box;
            justify-content: flex-end;
            padding: 20px 16px;
          }
        `}
      </style>
    </>
  )
}
