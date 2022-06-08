import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { BlockEstimate } from "@tallyho/tally-background/networks"
import { selectLastGasEstimatesRefreshTime } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  ESTIMATED_FEE_MULTIPLIERS,
  ESTIMATED_SPEED_IN_READABLE_FORMAT_RELATIVE_TO_CONFIDENCE_LEVEL,
} from "@tallyho/tally-background/constants/network-fees"
import { CUSTOM_GAS_SELECT } from "@tallyho/tally-background/features"
import {
  EstimatedFeesPerGas,
  NetworkFeeSettings,
  NetworkFeeTypeChosen,
  setCustomGas,
  GasOption,
} from "@tallyho/tally-background/redux-slices/transaction-construction"

import {
  selectCurrentNetwork,
  selectMainCurrencyPricePoint,
} from "@tallyho/tally-background/redux-slices/selectors"
import { weiToGwei } from "@tallyho/tally-background/lib/utils"
import { ETH } from "@tallyho/tally-background/constants"
import { PricePoint } from "@tallyho/tally-background/assets"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { SharedTypedInput } from "../Shared/SharedInput"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NetworkSettingsSelectDeprecated from "./NetworkSettingsSelectDeprecated"

import {
  NetworkSettingsSelectOptionButton,
  NetworkSettingsSelectOptionButtonCustom,
} from "./NetworkSettingsSelectOptionButtons"
import SharedButton from "../Shared/SharedButton"

interface NetworkSettingsSelectProps {
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
  networkSettings: NetworkFeeSettings
  onNetworkSettingsChange: (newSettings: NetworkFeeSettings) => void
  onSave: () => void
}

// Map a BlockEstimate from the backend to a GasOption for the UI.
const gasOptionFromEstimate = (
  mainCurrencyPricePoint: PricePoint | undefined,
  baseFeePerGas: bigint,
  gasLimit: bigint | undefined,
  { confidence, maxFeePerGas, maxPriorityFeePerGas }: BlockEstimate
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
    maxPriorityGwei: weiToGwei(maxPriorityFeePerGas),
    maxGwei: weiToGwei(maxFeePerGas).split(".")[0],
    dollarValue: dollarValue ? `$${dollarValue}` : "-",
    estimatedFeePerGas:
      (baseFeePerGas * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n,
    baseMaxFeePerGas: BigInt(maxFeePerGas) - BigInt(maxPriorityFeePerGas),
    baseMaxGwei: weiToGwei(BigInt(maxFeePerGas) - BigInt(maxPriorityFeePerGas)),
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
  onSave,
}: NetworkSettingsSelectProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const [gasOptions, setGasOptions] = useState<GasOption[]>([])
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const customGas = useBackgroundSelector((state) => {
    return state.transactionConstruction.customFeesPerGas
  })

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
        const baseFees = [regular, express, instant, custom]

        const updatedGasOptions: GasOption[] = []

        baseFees.forEach((option) => {
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

        if (customGas) {
          updatedGasOptions.push(
            gasOptionFromEstimate(
              mainCurrencyPricePoint,
              estimatedFeesPerGas.baseFeePerGas ?? 0n,
              gasLimit,
              customGas
            )
          )
        }

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
    customGas,
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
        maxFeePerGas:
          BigInt(customMaxBaseFee) + BigInt(customMaxPriorityFeePerGas),
      })
    )
  }

  if (!CUSTOM_GAS_SELECT) {
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
              <NetworkSettingsSelectOptionButtonCustom
                option={option}
                isActive={i === activeFeeIndex}
                handleSelectGasOption={() => handleSelectGasOption(i)}
                updateCustomGas={(
                  customMaxBaseFee: bigint,
                  customMaxPriorityFeePerGas: bigint
                ) =>
                  updateCustomGas(customMaxBaseFee, customMaxPriorityFeePerGas)
                }
              />
            ) : (
              <NetworkSettingsSelectOptionButton
                option={option}
                isActive={i === activeFeeIndex}
                handleSelectGasOption={() => handleSelectGasOption(i)}
              />
            )}
          </>
        )
      })}
      <footer>
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
            <span className="max_label">Total Max</span>
            <div className="price">
              {gasOptions?.[activeFeeIndex]?.maxGwei} Gwei
            </div>
          </div>
        </div>
        <div className="confirm">
          <SharedButton size="medium" type="primary" onClick={onSave}>
            Save settings
          </SharedButton>
        </div>
      </footer>
      <style jsx>
        {`
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
          .info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 42px;
            margin-bottom: 6px;
          }
          footer {
            position: fixed;
            bottom: 16px;
            width: inherit;
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
