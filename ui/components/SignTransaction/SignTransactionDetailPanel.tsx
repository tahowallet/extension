/* eslint-disable react-hooks/exhaustive-deps */
import React, { ReactElement, useEffect, useState } from "react"
import {
  selectEstimatedFeesPerGas,
  selectTransactionData,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { updateTransactionData } from "@tallyho/tally-background/redux-slices/transaction-construction"
import type {
  EnrichedEIP1559TransactionRequest,
  EnrichedLegacyTransactionRequest,
} from "@tallyho/tally-background/services/enrichment"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import FeeSettingsButton from "../NetworkFees/FeeSettingsButton"
import NetworkSettingsChooser from "../NetworkFees/NetworkSettingsChooser"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedBanner from "../Shared/SharedBanner"

export default function SignTransactionDetailPanel(): ReactElement {
  const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
    useState(false)
  const [updateNum, setUpdateNum] = useState(0)

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const dispatch = useBackgroundDispatch()

  // Using useEffect here to avoid a race condition where updateTransactionData is
  // dispatched with old transactionDetails. transactionDetails is dependent on a
  // dispatching setFeeType, for example, inside NetworkSettingsChooser.
  useEffect(() => {
    if (transactionDetails) {
      dispatch(updateTransactionData(transactionDetails))
    }
    // Should trigger only on gas updates. If `transactionDetails` is a dependency, this will run constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    updateNum,
    dispatch,
    (transactionDetails as EnrichedEIP1559TransactionRequest)?.maxFeePerGas,
    transactionDetails?.gasLimit,
    (transactionDetails as EnrichedLegacyTransactionRequest)?.gasPrice,
    (transactionDetails as EnrichedEIP1559TransactionRequest)?.maxFeePerGas,
  ])

  if (transactionDetails === undefined) return <></>

  const hasInsufficientFundsWarning =
    transactionDetails.annotation?.warnings?.includes("insufficient-funds")

  const networkSettingsSaved = () => {
    setUpdateNum(updateNum + 1)

    setNetworkSettingsModalOpen(false)
  }

  return (
    <div className="detail_items_wrap standard_width_padded">
      <SharedSlideUpMenu
        size="custom"
        isOpen={networkSettingsModalOpen}
        close={() => setNetworkSettingsModalOpen(false)}
        customSize={`${
          3 * 56 + 320 + (hasInsufficientFundsWarning ? 15 : 0)
        }px`}
      >
        <NetworkSettingsChooser
          estimatedFeesPerGas={estimatedFeesPerGas}
          onNetworkSettingsSave={networkSettingsSaved}
        />
      </SharedSlideUpMenu>
      {hasInsufficientFundsWarning && (
        <span className="detail_item">
          <SharedBanner icon="notif-attention" iconColor="var(--attention)">
            <span className="detail_warning">
              Not enough {transactionDetails.network.baseAsset.symbol} for
              network fees
            </span>
          </SharedBanner>
        </span>
      )}
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
            margin-bottom: 10px;
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
          .detail_warning {
            font-size: 16px;
            line-height: 24px;
            font-weight: 500;
            color: var(--attention);
          }
        `}
      </style>
    </div>
  )
}
