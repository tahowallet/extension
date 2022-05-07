import { BlockEstimate } from "@tallyho/tally-background/networks"
import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  NetworkFeeTypeChosen,
  selectLastGasEstimatesRefreshTime,
  setCustomGas,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  ESTIMATED_FEE_MULTIPLIERS,
  ESTIMATED_SPEED_IN_READABLE_FORMAT_RELATIVE_TO_CONFIDENCE_LEVEL,
} from "@tallyho/tally-background/constants/network-fees"
import { CUSTOM_GAS_SELECT } from "@tallyho/tally-background/features"
import { selectMainCurrencyPricePoint } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { weiToGwei } from "@tallyho/tally-background/lib/utils"
import { ETH } from "@tallyho/tally-background/constants"
import { PricePoint } from "@tallyho/tally-background/assets"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import SharedInput, { SharedTypedInput } from "../Shared/SharedInput"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import capitalize from "../../utils/capitalize"
import NetworkSettingsSelectDeprecated from "./NetworkSettingsSelectDeprecated"

interface NetworkSettingsSelectProps {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  networkSettings: NetworkFeeSettings
  onNetworkSettingsChange: (newSettings: NetworkFeeSettings) => void
}

type GasOption = {
  confidence: string
  estimatedSpeed: string
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
  gasLimit: bigint | undefined,
  { confidence, price, maxFeePerGas, maxPriorityFeePerGas }: BlockEstimate
): GasOption => {
  const feeOptionData: {
    [confidence: number]: NetworkFeeTypeChosen
  } = {
    70: NetworkFeeTypeChosen.Regular,
    95: NetworkFeeTypeChosen.Express,
    99: NetworkFeeTypeChosen.Instant,
    0: NetworkFeeTypeChosen.Custom,
  }

  const feeAssetAmount =
    typeof gasLimit !== "undefined"
      ? enrichAssetAmountWithMainCurrencyValues(
          {
            asset: ETH,
            amount: (maxFeePerGas + maxPriorityFeePerGas) * gasLimit,
          },
          mainCurrencyPricePoint,
          2
        )
      : undefined
  const dollarValue = feeAssetAmount?.localizedMainCurrencyAmount
  return {
    confidence: `${confidence}`,
    estimatedSpeed:
      ESTIMATED_SPEED_IN_READABLE_FORMAT_RELATIVE_TO_CONFIDENCE_LEVEL[
        confidence
      ],
    type: feeOptionData[confidence],
    estimatedGwei: weiToGwei(
      (baseFeePerGas * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n
    ).split(".")[0],
    maxGwei: weiToGwei(maxFeePerGas).split(".")[0],
    dollarValue: dollarValue ? `$${dollarValue}` : "-",
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
    const now = Date.now()
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
  const dispatch = useBackgroundDispatch()

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
        maxFeePerGas: gasOptions[index].maxFeePerGas,
        maxPriorityFeePerGas: gasOptions[index].maxPriorityFeePerGas,
      },
      gasLimit: networkSettings.gasLimit,
      suggestedGasLimit: networkSettings.suggestedGasLimit,
    })
  }

  const updateGasOptions = useCallback(() => {
    if (typeof estimatedFeesPerGas !== "undefined") {
      const { regular, express, instant, custom } = estimatedFeesPerGas ?? {}
      const gasLimit =
        networkSettings.gasLimit ?? networkSettings.suggestedGasLimit

      if (typeof instant !== "undefined") {
        const basePrices = [regular, express, instant, custom]

        const updatedGasOptions: GasOption[] = []

        basePrices.forEach((option) => {
          if (option) {
            updatedGasOptions.push(
              gasOptionFromEstimate(
                mainCurrencyPricePoint,
                estimatedFeesPerGas.baseFeePerGas ?? 0n,
                gasLimit,
                option
              )
            )
          }
        })

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
    networkSettings.gasLimit,
    networkSettings.suggestedGasLimit,
    mainCurrencyPricePoint,
    currentlySelectedType,
  ])

  useEffect(() => {
    updateGasOptions()
  }, [updateGasOptions])

  const setGasLimit = (gasLimit: bigint | undefined) => {
    onNetworkSettingsChange({ ...networkSettings, gasLimit })
  }

  function updateCustomGas(
    customMaxBaseFee: bigint,
    customMaxPriorityFeePerGas: bigint
  ) {
    dispatch(
      setCustomGas({
        maxPriorityFeePerGas: customMaxPriorityFeePerGas,
        maxFeePerGas: customMaxBaseFee + customMaxPriorityFeePerGas,
      })
    )
  }

  if (CUSTOM_GAS_SELECT) {
    return (
      <NetworkSettingsSelectDeprecated
        estimatedFeesPerGas={estimatedFeesPerGas}
        networkSettings={networkSettings}
        onNetworkSettingsChange={onNetworkSettingsChange}
      />
    )
  }

  return (
    <div className="fees standard_width">
      {gasOptions.map((option, i) => {
        return (
          <>
            {option.type === "custom" ? (
              <button
                key={option.confidence}
                className={`option ${i === activeFeeIndex ? "active" : ""}`}
                onClick={() => handleSelectGasOption(i)}
                type="button"
              >
                <div className="option_left">
                  <div className="name">{capitalize(option.type)}</div>
                </div>
                <div className="input_wrap">
                  <SharedInput
                    label="Miner"
                    value={`${
                      Number(option.maxPriorityFeePerGas) / 1000000000 // @TODO Replace
                    }`}
                    onChange={(value) => {
                      updateCustomGas(
                        option.maxFeePerGas - option.maxPriorityFeePerGas,
                        BigInt(value) * BigInt(1000000000) // @TODO Replace
                      )
                    }}
                  />
                </div>
                <div className="option_right">
                  <div className="input_wrap">
                    <SharedInput
                      value={`${
                        (option.maxFeePerGas - option.maxPriorityFeePerGas) /
                        BigInt(1000000000) // @TODO Replace
                      }`}
                      label="Max Base"
                      onChange={(value) => {
                        updateCustomGas(
                          BigInt(value) * BigInt(1000000000), // @TODO Replace
                          option.maxPriorityFeePerGas
                        )
                      }}
                    />
                  </div>
                </div>
              </button>
            ) : (
              <button
                key={option.confidence}
                className={`option ${i === activeFeeIndex ? "active" : ""}`}
                onClick={() => handleSelectGasOption(i)}
                type="button"
              >
                <div className="option_left">
                  <div className="name">{capitalize(option.type)}</div>
                  <div className="subtext">{option.estimatedSpeed}</div>
                </div>
                Miner:
                {`${Number(option.maxPriorityFeePerGas) / 1000000000}`}
                <div className="option_right">
                  Max Base:
                  <div className="price">{`${
                    BigInt(option.maxGwei) -
                    option.maxPriorityFeePerGas / BigInt(1000000000) // @TODO Replace
                  }`}</div>
                </div>
              </button>
            )}
          </>
        )
      })}
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
            padding: 15px;
            margin: 8px 0;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid transparent;
            position: relative;
          }
          .input_wrap {
            width: 100px;
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
            gap: 4px;
          }
          .option_left {
            text-align: left;
            flex-direction: column;
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
            color: var(--success);
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
