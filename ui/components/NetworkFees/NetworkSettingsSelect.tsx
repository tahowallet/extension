import { BlockEstimate } from "@tallyho/tally-background/networks"
import {
  EstimatedFeesPerGas,
  NetworkFeeSetting,
  NetworkFeeTypeChosen,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { formatEther } from "@ethersproject/units"
import { ESTIMATED_FEE_MULTIPLIERS } from "@tallyho/tally-background/constants/networkFees"
import { selectMainCurrencyUnitPrice } from "@tallyho/tally-background/redux-slices/selectors"
import React, {
  ReactElement,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react"
import { weiToGwei } from "@tallyho/tally-background/lib/utils"
import SharedInput from "../Shared/SharedInput"
import { useBackgroundSelector } from "../../hooks"

interface NetworkSettingsSelectProps {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  gasLimit: string
  setCustomGasLimit: React.Dispatch<SetStateAction<string>>
  onSelectNetworkSetting: ({ feeType, gasLimit }: NetworkFeeSetting) => void
  selectedFeeType: string
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

export default function NetworkSettingsSelect({
  estimatedFeesPerGas,
  gasLimit,
  setCustomGasLimit,
  onSelectNetworkSetting,
  selectedFeeType,
}: NetworkSettingsSelectProps): ReactElement {
  const [gasOptions, setGasOptions] = useState<GasOption[]>([])
  const [activeFeeIndex, setActiveFeeIndex] = useState(0)
  const [currentlySelectedType, setCurrentlySelectedType] =
    useState(selectedFeeType)

  const ethUnitPrice = useBackgroundSelector(selectMainCurrencyUnitPrice)

  const capitalize = (s: string) => {
    return s[0].toUpperCase() + s.slice(1)
  }

  // Select activeFeeIndex to regular option once gasOptions load
  useEffect(() => {
    if (gasOptions.length > 0) {
      onSelectNetworkSetting({
        feeType: gasOptions[activeFeeIndex].type,
        values: {
          maxFeePerGas: gasOptions[activeFeeIndex].maxFeePerGas,
          maxPriorityFeePerGas: gasOptions[activeFeeIndex].maxPriorityFeePerGas,
        },
        gasLimit,
      })
    }
  }, [gasOptions, activeFeeIndex, onSelectNetworkSetting, gasLimit])

  const handleSelectGasOption = (index: number) => {
    setActiveFeeIndex(index)
    setCurrentlySelectedType(gasOptions[index].type)
    onSelectNetworkSetting({
      feeType: gasOptions[index].type,
      values: {
        maxFeePerGas: gasOptions[index].maxFeePerGas,
        maxPriorityFeePerGas: gasOptions[index].maxPriorityFeePerGas,
      },
      gasLimit,
    })
  }

  const updateGasOptions = useCallback(() => {
    const formatBlockEstimate = (option: BlockEstimate) => {
      const { confidence } = option
      const baseFee = estimatedFeesPerGas?.baseFeePerGas || 0n
      const feeOptionData: {
        type: { [key: number]: NetworkFeeTypeChosen }
      } = {
        type: {
          70: NetworkFeeTypeChosen.Regular,
          95: NetworkFeeTypeChosen.Express,
          99: NetworkFeeTypeChosen.Instant,
        },
      }

      const ethAmount = formatEther(
        (option.maxFeePerGas + option.maxPriorityFeePerGas) *
          (gasLimit ? BigInt(parseInt(gasLimit, 10)) : 21000n)
      )

      const feeFiatPrice =
        ethUnitPrice !== undefined
          ? `${(+ethAmount * ethUnitPrice).toFixed(2)}`
          : "N/A"

      return {
        confidence: `${confidence}`,
        type: feeOptionData.type[confidence],
        estimatedGwei: weiToGwei(
          (baseFee * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n
        ).split(".")[0],
        maxGwei: weiToGwei(option.maxFeePerGas).split(".")[0],
        dollarValue: feeFiatPrice,
        price: option.price,
        estimatedFeePerGas:
          (baseFee * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n,
        maxFeePerGas: option.maxFeePerGas,
        maxPriorityFeePerGas: option.maxPriorityFeePerGas,
      }
    }
    if (estimatedFeesPerGas) {
      const { regular, express, instant } = estimatedFeesPerGas ?? {}
      if (
        typeof instant !== "undefined" &&
        typeof express !== "undefined" &&
        typeof regular !== "undefined"
      ) {
        const basePrices = [regular, express, instant]

        const updatedGasOptions = basePrices.map((option) =>
          formatBlockEstimate(option)
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
  }, [estimatedFeesPerGas, gasLimit, ethUnitPrice, currentlySelectedType])

  useEffect(() => {
    updateGasOptions()
  }, [updateGasOptions])

  return (
    <div>
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
            value={gasLimit}
            onChange={(val) => setCustomGasLimit(val)}
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
