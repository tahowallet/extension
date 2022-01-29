import { BlockEstimate } from "@tallyho/tally-background/networks"
import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  NetworkFeeTypeChosen,
  selectLastGasEstimatesRefreshTime,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { ESTIMATED_FEE_MULTIPLIERS } from "@tallyho/tally-background/constants/network-fees"
import { selectMainCurrencyPricePoint } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { weiToGwei } from "@tallyho/tally-background/lib/utils"
import { ETH } from "@tallyho/tally-background/constants"
import { PricePoint } from "@tallyho/tally-background/assets"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import SharedInput from "../Shared/SharedInput"
import { useBackgroundSelector } from "../../hooks"
import capitalize from "../../utils/capitalize"

interface NetworkSettingsSelectProps {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  networkSettings: NetworkFeeSettings
  onNetworkSettingsChange: (newSettings: NetworkFeeSettings) => void
}

type GasOption = {
  confidence: string
  type: NetworkFeeTypeChosen
  estimatedGwei: string
  maxGwei: string
  dollarValue: string
  price: bigint
  estimatedFeePerGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

// Map a BlockEstimate from the backend to a GasOption for the UI.
const gasOptionFromEstimate = (
  mainCurrencyPricePoint: PricePoint | undefined,
  baseFeePerGas: bigint,
  gasLimit: string,
  { confidence, price, maxFeePerGas, maxPriorityFeePerGas }: BlockEstimate
): GasOption => {
  const feeOptionData: {
    [confidence: number]: NetworkFeeTypeChosen
  } = {
    70: NetworkFeeTypeChosen.Regular,
    95: NetworkFeeTypeChosen.Express,
    99: NetworkFeeTypeChosen.Instant,
  }

  const feeAssetAmount =
    typeof mainCurrencyPricePoint !== "undefined"
      ? enrichAssetAmountWithMainCurrencyValues(
          {
            asset: ETH,
            amount:
              (maxFeePerGas + maxPriorityFeePerGas) *
              (gasLimit ? BigInt(gasLimit) : 21000n),
          },
          mainCurrencyPricePoint,
          2
        )
      : undefined

  return {
    confidence: `${confidence}`,
    type: feeOptionData[confidence],
    estimatedGwei: weiToGwei(
      (baseFeePerGas * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n
    ).split(".")[0],
    maxGwei: weiToGwei(maxFeePerGas).split(".")[0],
    dollarValue: feeAssetAmount?.localizedMainCurrencyAmount ?? "N/A",
    estimatedFeePerGas:
      (baseFeePerGas * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n,
    price,
    maxFeePerGas,
    maxPriorityFeePerGas,
  }
}

function EstimateRefreshCountdownDivider() {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const gasTime = useBackgroundSelector(selectLastGasEstimatesRefreshTime)

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
    <div className="divider">
      <div className="divider-background" />
      <div
        className="divider-cover"
        style={{ left: -384 + (384 - timeRemaining * (384 / 120)) }}
      />
    </div>
  )
}

export default function NetworkSettingsSelect({
  // FIXME Map this to GasOption[] in a selector.
  estimatedFeesPerGas,
  networkSettings,
  onNetworkSettingsChange,
}: NetworkSettingsSelectProps): ReactElement {
  const [gasOptions, setGasOptions] = useState<GasOption[]>([])
  const [activeFeeIndex, setActiveFeeIndex] = useState(0)
  const [currentlySelectedType, setCurrentlySelectedType] = useState(
    networkSettings.feeType
  )

  const mainCurrencyPricePoint = useBackgroundSelector(
    selectMainCurrencyPricePoint
  )

  // Select activeFeeIndex to regular option once gasOptions load
  useEffect(() => {
    if (gasOptions.length > 0) {
      onNetworkSettingsChange({
        feeType: gasOptions[activeFeeIndex].type,
        values: {
          maxFeePerGas: gasOptions[activeFeeIndex].maxFeePerGas,
          maxPriorityFeePerGas: gasOptions[activeFeeIndex].maxPriorityFeePerGas,
        },
        gasLimit: networkSettings.gasLimit,
      })
    }
  }, [gasOptions, activeFeeIndex, onNetworkSettingsChange, networkSettings])

  const handleSelectGasOption = (index: number) => {
    setActiveFeeIndex(index)
    setCurrentlySelectedType(gasOptions[index].type)
    onNetworkSettingsChange({
      feeType: gasOptions[index].type,
      values: {
        maxFeePerGas: gasOptions[index].maxFeePerGas,
        maxPriorityFeePerGas: gasOptions[index].maxPriorityFeePerGas,
      },
      gasLimit: networkSettings.gasLimit,
    })
  }

  const updateGasOptions = useCallback(() => {
    if (typeof estimatedFeesPerGas !== "undefined") {
      const { regular, express, instant } = estimatedFeesPerGas ?? {}
      if (
        typeof instant !== "undefined" &&
        typeof express !== "undefined" &&
        typeof regular !== "undefined"
      ) {
        const basePrices = [regular, express, instant]

        const updatedGasOptions = basePrices.map((option) =>
          gasOptionFromEstimate(
            mainCurrencyPricePoint,
            estimatedFeesPerGas.baseFeePerGas,
            networkSettings.gasLimit,
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
    mainCurrencyPricePoint,
    networkSettings.gasLimit,
    currentlySelectedType,
  ])

  useEffect(() => {
    updateGasOptions()
  }, [updateGasOptions])

  const setGasLimit = (newGasLimit: string) => {
    // FIXME Make gasLimit a bigint and parse/validate here, as close to the user
    // FIXME entry as possible. Note that we also need to track when the user
    // FIXME doesn't change the gas limit as that generally signals preferring
    // FIXME the wallet's gas estimates.
    onNetworkSettingsChange({
      ...networkSettings,
      gasLimit: newGasLimit,
    })
  }

  return (
    <div className="fees standard_width">
      <div className="title">Network Fees</div>

      <EstimateRefreshCountdownDivider />

      {gasOptions.map((option, i) => {
        return (
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
              <div className="price">{`~${option.estimatedGwei} Gwei`}</div>
              <div className="subtext">${option.dollarValue}</div>
            </div>
          </button>
        )
      })}
      <div className="info">
        <div className="limit">
          <SharedInput
            id="gasLimit"
            value={networkSettings.gasLimit}
            onChange={setGasLimit}
            defaultValue="21000"
            label="Gas limit"
            type="number"
            focusedLabelBackgroundColor="var(--green-95)"
          />
        </div>
        <div className="max_fee">
          <span className="max_label">Max Fee</span>
          <div className="price">
            {gasOptions?.[activeFeeIndex]?.maxGwei} Gwei
          </div>
        </div>
      </div>
      <style jsx>
        {`
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
          }
          .option.active {
            border: 1px solid #22c480;
            box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
              0px 6px 8px rgba(0, 20, 19, 0.24),
              0px 2px 4px rgba(0, 20, 19, 0.34);
          }
          .option.active .name {
            color: #22c480;
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
            color: #22c480;
            opacity: 0.8;
            font-size: 10px;
          }
          .info {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .limit {
            margin: 16px 0;
            width: 40%;
            position: relative;
          }
        `}
      </style>
    </div>
  )
}
