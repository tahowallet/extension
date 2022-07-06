import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  setFeeType,
  updateTransactionData,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  selectDefaultNetworkFeeSettings,
  selectTransactionData,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import React, { ReactElement, useState, useEffect } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
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
  const transactionDetails = useBackgroundSelector(selectTransactionData)
  const [updateNum, setUpdateNum] = useState(0)

  const dispatch = useBackgroundDispatch()

  const saveNetworkSettings = async () => {
    await dispatch(setFeeType(networkSettings.feeType))
    setUpdateNum(updateNum + 1)
    onNetworkSettingsSave(networkSettings)
  }

  useEffect(() => {
    if (transactionDetails) {
      dispatch(updateTransactionData(transactionDetails))
    }
    // Should trigger only on gas updates. If `transactionDetails` is a dependency, this will run constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    updateNum,
    dispatch,
    transactionDetails?.maxFeePerGas,
    transactionDetails?.gasLimit,
    transactionDetails?.maxFeePerGas,
  ])

  return (
    <>
      <div className="wrapper">
        <NetworkSettingsSelect
          estimatedFeesPerGas={estimatedFeesPerGas}
          networkSettings={networkSettings}
          onNetworkSettingsChange={setNetworkSettings}
          onSave={saveNetworkSettings}
        />
      </div>
      <style jsx>
        {`
          .wrapper {
            height: 100%;
            display: flex;
            flex-flow: column;
            margin-left: 12px;
            align-items: center;
          }
        `}
      </style>
    </>
  )
}
