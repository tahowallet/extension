import React, { ReactElement, useState } from "react"
import {
  NetworkFeeSettings,
  selectEstimatedFeesPerGas,
  selectTransactionData,
  updateTransactionOptions,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import FeeSettingsButton from "../NetworkFees/FeeSettingsButton"
import NetworkSettingsChooser from "../NetworkFees/NetworkSettingsChooser"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"

export default function SignTransactionDetailPanel(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
    useState(false)

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const transactionDetails = useBackgroundSelector(selectTransactionData)

  if (transactionDetails === undefined) return <></>

  const networkSettingsSaved = async (networkSetting: NetworkFeeSettings) => {
    dispatch(
      updateTransactionOptions({
        ...transactionDetails,
        gasLimit: networkSetting.gasLimit ?? transactionDetails.gasLimit,
      })
    )

    setNetworkSettingsModalOpen(false)
  }

  return (
    <div className="detail_items_wrap standard_width_padded">
      <SharedSlideUpMenu
        size="custom"
        isOpen={networkSettingsModalOpen}
        close={() => setNetworkSettingsModalOpen(false)}
        customSize={`${3 * 56 + 320}px`}
      >
        <NetworkSettingsChooser
          estimatedFeesPerGas={estimatedFeesPerGas}
          onNetworkSettingsSave={networkSettingsSaved}
        />
      </SharedSlideUpMenu>
      <span className="detail_item">
        Estimated network fee
        <FeeSettingsButton onClick={() => setNetworkSettingsModalOpen(true)} />
      </span>
      <style jsx>
        {`
          .detail_item {
            width: 100%;
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .detail_items_wrap {
            display: flex;
            margin-top: 21px;
            flex-direction: column;
          }
          .detail_item_right {
            color: var(--green-20);
            font-size: 16px;
          }
        `}
      </style>
    </div>
  )
}
