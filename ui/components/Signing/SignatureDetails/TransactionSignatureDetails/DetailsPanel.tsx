/* eslint-disable react-hooks/exhaustive-deps */
import React, { ReactElement, useEffect, useState } from "react"
import { selectEstimatedFeesPerGas } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { updateTransactionData } from "@tallyho/tally-background/redux-slices/transaction-construction"
import type {
  EnrichedEIP1559TransactionRequest,
  EnrichedEVMTransactionRequest,
  EnrichedLegacyTransactionRequest,
} from "@tallyho/tally-background/services/enrichment"
import { useTranslation } from "react-i18next"
import {
  BINANCE_SMART_CHAIN,
  EIP_1559_COMPLIANT_CHAIN_IDS,
} from "@tallyho/tally-background/constants"
import classNames from "classnames"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import SharedSlideUpMenu from "../../../Shared/SharedSlideUpMenu"
import NetworkSettingsChooser from "../../../NetworkFees/NetworkSettingsChooser"
import FeeSettingsButton from "../../../NetworkFees/FeeSettingsButton"
import TransactionAdditionalDetails from "./TransactionAdditionalDetails"
import TransactionSignatureDetailsWarning from "./TransactionSignatureDetailsWarning"

export type PanelState = {
  dismissedWarnings: string[]
}

type DetailPanelProps = {
  transactionRequest: EnrichedEVMTransactionRequest
  defaultPanelState?: PanelState
}

export default function DetailPanel({
  transactionRequest,
  defaultPanelState,
}: DetailPanelProps): ReactElement {
  const [panelState, setPanelState] = useState(
    defaultPanelState ?? { dismissedWarnings: [] }
  )
  const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
    useState(false)
  const [updateNum, setUpdateNum] = useState(0)

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const dispatch = useBackgroundDispatch()

  const { t } = useTranslation()

  // Using useEffect here to avoid a race condition where updateTransactionData is
  // dispatched with old transactionDetails. transactionDetails is dependent on a
  // dispatching setFeeType, for example, inside NetworkSettingsChooser.
  useEffect(() => {
    if (transactionRequest) {
      dispatch(updateTransactionData(transactionRequest))
    }
    // Should trigger only on gas updates. If `transactionDetails` is a dependency, this will run constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    updateNum,
    dispatch,
    (transactionRequest as EnrichedEIP1559TransactionRequest)?.maxFeePerGas,
    transactionRequest?.gasLimit,
    (transactionRequest as EnrichedLegacyTransactionRequest)?.gasPrice,
    (transactionRequest as EnrichedEIP1559TransactionRequest)?.maxFeePerGas,
  ])

  if (transactionRequest === undefined) return <></>

  const isEIP1559Compliant = EIP_1559_COMPLIANT_CHAIN_IDS.has(
    transactionRequest.network.chainID
  )

  const hasInsufficientFundsWarning =
    transactionRequest.annotation?.warnings?.includes("insufficient-funds")

  const isContractAddress =
    transactionRequest.annotation?.warnings?.includes("send-to-contract")

  const networkSettingsSaved = () => {
    setUpdateNum(updateNum + 1)

    setNetworkSettingsModalOpen(false)
  }

  const getHightForSlideUpMenu = () => {
    return `${
      transactionRequest.network.name === BINANCE_SMART_CHAIN.name
        ? 150
        : 3 * 56 +
          320 +
          (hasInsufficientFundsWarning ? 15 : 0) +
          (isEIP1559Compliant ? 0 : 40)
    }px`
  }

  return (
    <div className="detail_items_wrap standard_width_padded">
      <SharedSlideUpMenu
        size="custom"
        isOpen={networkSettingsModalOpen}
        close={() => setNetworkSettingsModalOpen(false)}
        customSize={getHightForSlideUpMenu()}
      >
        <NetworkSettingsChooser
          estimatedFeesPerGas={estimatedFeesPerGas}
          onNetworkSettingsSave={networkSettingsSaved}
        />
      </SharedSlideUpMenu>
      {isContractAddress &&
        !panelState.dismissedWarnings.includes("send-to-contract") && (
          <span className="detail_item">
            <TransactionSignatureDetailsWarning
              message={t("wallet.sendToContractWarning")}
              dismissable
              onDismiss={() =>
                setPanelState((state) => ({
                  ...state,
                  dismissedWarnings: [
                    ...state.dismissedWarnings,
                    "send-to-contract",
                  ],
                }))
              }
            />
          </span>
        )}
      <span className="detail_item">
        <div className="detail_label">
          {t("networkFees.estimatedNetworkFee")}
        </div>
        <FeeSettingsButton onClick={() => setNetworkSettingsModalOpen(true)} />
      </span>
      <TransactionAdditionalDetails
        transactionRequest={transactionRequest}
        annotation={transactionRequest.annotation}
      />
      <span
        className={classNames("detail_item warning", {
          visible: hasInsufficientFundsWarning,
        })}
      >
        <TransactionSignatureDetailsWarning
          message={t("networkFees.insufficientBaseAsset", {
            symbol: transactionRequest.network.baseAsset.symbol,
          })}
        />
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
            gap: 10px;
            flex-direction: column;
          }
          .detail_item_right {
            color: var(--green-20);
            font-size: 16px;
          }
          .detail_label {
            font-weight: 500;
            font-size: 14px;
            line-height: 16px;
            letter-spacing: 0.03em;
          }
          .warning {
            width: 100%;
            max-height: 0;
            transform: translateX(calc(-100% - 24px));
            transition: transform ease-out 0.2s, max-height ease-out 0.2s;
          }
          .warning.visible {
            transform: translateX(0);
            max-height: 55px;
          }
        `}
      </style>
    </div>
  )
}
