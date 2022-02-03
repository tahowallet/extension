import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  selectDefaultNetworkFeeSettings,
  setFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useState } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import NetworkSettingsSelect from "./NetworkSettingsSelect"

interface NetworkSettingsChooserProps {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  onNetworkSettingsSave: (setting: NetworkFeeSettings) => void
}

export default function NetworkSettingsChooser({
  estimatedFeesPerGas,
  onNetworkSettingsSave,
}: NetworkSettingsChooserProps): ReactElement {
  const [networkSettings, setNetworkSettings] = useState(
    useBackgroundSelector(selectDefaultNetworkFeeSettings)
  )
  const dispatch = useBackgroundDispatch()

  const saveNetworkSettings = () => {
    dispatch(setFeeType(networkSettings.feeType))

    onNetworkSettingsSave(networkSettings)
  }

  return (
    <>
      <div className="wrapper">
        <NetworkSettingsSelect
          estimatedFeesPerGas={estimatedFeesPerGas}
          networkSettings={networkSettings}
          onNetworkSettingsChange={setNetworkSettings}
        />
        <div className="confirm">
          <SharedButton
            size="medium"
            type="primary"
            onClick={saveNetworkSettings}
          >
            Save
          </SharedButton>
        </div>
      </div>

      <style jsx>
        {`
          .wrapper {
            height: 100%;
            display: flex;
            flex-flow: column;
            justify-content: space-between;
            margin-left: 12px;
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
          .title {
            font-size: 22px;
            font-weight: 600;
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
          .network_fee {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            line-height: 16px;
            color: var(--green-40);
            margin-bottom: 12px;
          }
        `}
      </style>
    </>
  )
}
