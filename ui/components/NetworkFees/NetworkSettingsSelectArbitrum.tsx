import { BlockEstimate } from "@tallyho/tally-background/networks"
import { selectTransactionMainCurrencyPricePoint } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  NetworkFeeTypeChosen,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { weiToGwei } from "@tallyho/tally-background/lib/utils"
import { ETH } from "@tallyho/tally-background/constants"
import { PricePoint } from "@tallyho/tally-background/assets"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { SharedTypedInput } from "../Shared/SharedInput"
import { useBackgroundSelector } from "../../hooks"
import { capitalize } from "../../utils/textUtils"
import SharedButton from "../Shared/SharedButton"

interface NetworkSettingsSelectProps {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  networkSettings: NetworkFeeSettings
  onNetworkSettingsChange: (newSettings: NetworkFeeSettings) => void
  onSave: () => void
}

type GasOption = {
  confidence: string
  type: NetworkFeeTypeChosen
  estimatedGwei: string
  dollarValue: string
  estimatedFeePerGas: bigint
  gasPrice: bigint
}

// Map a BlockEstimate from the backend to a GasOption for the UI.
const gasOptionFromEstimate = (
  mainCurrencyPricePoint: PricePoint | undefined,
  baseFeePerGas: bigint,
  gasLimit: bigint | undefined,
  { confidence, price }: BlockEstimate
): GasOption => {
  const feeOptionData: {
    [confidence: number]: NetworkFeeTypeChosen
  } = {
    70: NetworkFeeTypeChosen.Regular,
    95: NetworkFeeTypeChosen.Express,
    99: NetworkFeeTypeChosen.Instant,
  }

  const feeAssetAmount =
    typeof gasLimit !== "undefined"
      ? enrichAssetAmountWithMainCurrencyValues(
          {
            asset: ETH,
            amount: baseFeePerGas * gasLimit,
          },
          mainCurrencyPricePoint,
          2
        )
      : undefined
  const dollarValue = feeAssetAmount?.localizedMainCurrencyAmount

  return {
    confidence: `${confidence}`,
    type: feeOptionData[confidence],
    estimatedGwei: weiToGwei(baseFeePerGas),
    dollarValue: dollarValue ? `$${dollarValue}` : "-",
    estimatedFeePerGas: baseFeePerGas,
    gasPrice: price ?? 0n,
  }
}

export default function NetworkSettingsSelectArbitrum({
  // FIXME Map this to GasOption[] in a selector.
  estimatedFeesPerGas,
  networkSettings,
  onSave,
  onNetworkSettingsChange,
}: NetworkSettingsSelectProps): ReactElement {
  const [gasOptions, setGasOptions] = useState<GasOption[]>([])
  const [activeFeeIndex, setActiveFeeIndex] = useState(0)
  const [currentlySelectedType, setCurrentlySelectedType] = useState(
    networkSettings.feeType
  )

  const mainCurrencyPricePoint = useBackgroundSelector(
    selectTransactionMainCurrencyPricePoint
  )

  // Select activeFeeIndex to regular option once gasOptions load
  useEffect(() => {
    if (gasOptions.length > 0) {
      onNetworkSettingsChange({
        feeType: gasOptions[activeFeeIndex].type,
        values: {
          maxFeePerGas: 0n,
          maxPriorityFeePerGas: 0n,
          gasPrice: gasOptions[activeFeeIndex].gasPrice,
        },
        gasLimit: networkSettings.gasLimit,
        suggestedGasLimit: networkSettings.suggestedGasLimit,
      })
    }
  }, [
    gasOptions,
    activeFeeIndex,
    onNetworkSettingsChange,
    networkSettings.gasLimit,
    networkSettings.suggestedGasLimit,
  ])

  const handleSelectGasOption = (index: number) => {
    setActiveFeeIndex(index)
    setCurrentlySelectedType(gasOptions[index].type)
    onNetworkSettingsChange({
      feeType: gasOptions[index].type,
      values: {
        maxFeePerGas: 0n,
        maxPriorityFeePerGas: 0n,
        gasPrice: gasOptions[index].gasPrice,
      },
      gasLimit: networkSettings.gasLimit,
      suggestedGasLimit: networkSettings.suggestedGasLimit,
    })
  }

  const updateGasOptions = useCallback(() => {
    if (typeof estimatedFeesPerGas !== "undefined") {
      const { regular, express, instant } = estimatedFeesPerGas ?? {}
      const gasLimit =
        networkSettings.gasLimit ?? networkSettings.suggestedGasLimit

      if (
        typeof instant !== "undefined" &&
        typeof express !== "undefined" &&
        typeof regular !== "undefined"
      ) {
        const basePrices = [regular, express, instant]

        const updatedGasOptions = basePrices.map((option) =>
          gasOptionFromEstimate(
            mainCurrencyPricePoint,
            option.price ?? 0n,
            gasLimit,
            option
          )
        )
        const selectedGasFeeIndex = updatedGasOptions.findIndex(
          (el) => el.type === currentlySelectedType
        )
        const currentlySelectedFeeIndex =
          selectedGasFeeIndex === -1 ? 0 : selectedGasFeeIndex

        setGasOptions(updatedGasOptions)
        setActiveFeeIndex(currentlySelectedFeeIndex)
      }
    }
  }, [
    estimatedFeesPerGas,
    networkSettings.suggestedGasLimit,
    networkSettings.gasLimit,
    mainCurrencyPricePoint,
    currentlySelectedType,
  ])

  useEffect(() => {
    updateGasOptions()
  }, [updateGasOptions])

  const setGasLimit = (gasLimit: bigint | undefined) => {
    onNetworkSettingsChange({ ...networkSettings, gasLimit })
  }

  return (
    <div className="fees standard_width">
      <div className="title">Network Fees</div>

      {gasOptions.map((option, i) => (
        <button
          key={option.confidence}
          className={`option ${i === activeFeeIndex ? "active" : ""}`}
          onClick={() => handleSelectGasOption(i)}
          type="button"
        >
          <div className="option_left">
            <div className="name">{capitalize(option.type)}</div>
            <div className="subtext">Probability: {option.confidence}%</div>
          </div>
          <div className="option_right">
            <div className="price ellipsis">{`${option.estimatedGwei} Gwei`}</div>
            <div className="subtext">{option.dollarValue}</div>
          </div>
        </button>
      ))}
      <div className="info">
        <div className="limit">
          <SharedTypedInput
            id="gasLimit"
            value={networkSettings.gasLimit?.toString() ?? ""}
            placeholder={networkSettings.suggestedGasLimit?.toString() ?? ""}
            onChange={setGasLimit}
            parseAndValidate={(value) => {
              if (value.trim() === "") {
                return { parsed: undefined }
              }
              try {
                const parsed = BigInt(value)
                if (parsed < 0n) {
                  return {
                    error: "Gas Limit must be greater than 0",
                  }
                }

                return { parsed }
              } catch (e) {
                return { error: "Gas Limit must be a number" }
              }
            }}
            label="Gas limit"
            type="number"
            focusedLabelBackgroundColor="var(--green-95)"
            step={1000}
          />
        </div>
        <div className="max_fee">
          <span className="max_label">Max Fee</span>
          <div className="price ellipsis">
            {gasOptions?.[activeFeeIndex]?.estimatedGwei} Gwei
          </div>
        </div>
      </div>
      <div className="confirm">
        <SharedButton size="medium" type="primary" onClick={onSave}>
          Save settings
        </SharedButton>
      </div>
      <style jsx>
        {`
          .title {
            margin-bottom: 16px;
          }
          .option {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #002522;
            box-sizing: border-box;
            padding: 12px;
            margin: 8px 0;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid transparent;
          }
          .option.active {
            border-color: var(--success);
            box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
              0px 6px 8px rgba(0, 20, 19, 0.24),
              0px 2px 4px rgba(0, 20, 19, 0.34);
          }
          .option.active .name {
            color: var(--success);
          }
          .option_left,
          .option_right {
            display: flex;
            flex-flow: column;
            gap: 4px;
          }
          .option_left {
            text-align: left;
          }
          .option_right {
            text-align: right;
          }
          .name,
          .price {
            color: var(--green--5);
            font-size: 18px;
            font-weight: 600;
          }
          .price {
            width: 176px;
            text-align: right;
          }
          .subtext {
            color: var(--green-60);
            font-size: 14px;
          }
          .max_fee {
            display: flex;
            flex-flow: column;
            margin-right: 10px;
            align-items: flex-end;
          }
          .max_label {
            font-size: 14px;
            color: var(--green-40);
          }
          .currentlySelected {
            color: var(--success);
            opacity: 0.8;
            font-size: 10px;
          }
          .info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 26px;
          }
          .limit {
            margin: 16px 0;
            width: 40%;
            position: relative;
          }
          .confirm {
            float: right;
          }
        `}
      </style>
    </div>
  )
}
