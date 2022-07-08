import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { BlockEstimate } from "@tallyho/tally-background/networks"
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

import { weiToGwei } from "@tallyho/tally-background/lib/utils"
import { ETH } from "@tallyho/tally-background/constants"
import { PricePoint } from "@tallyho/tally-background/assets"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import {
  selectTransactionData,
  selectTransactionMainCurrencyPricePoint,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { SharedTypedInput } from "../Shared/SharedInput"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NetworkSettingsSelectDeprecated from "./NetworkSettingsSelectDeprecated"

import {
  NetworkSettingsSelectOptionButton,
  NetworkSettingsSelectOptionButtonCustom,
} from "./NetworkSettingsSelectOptionButtons"
import SharedButton from "../Shared/SharedButton"
import SharedBanner from "../Shared/SharedBanner"

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
            amount: maxFeePerGas * gasLimit,
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

export default function NetworkSettingsSelect({
  // FIXME Map this to GasOption[] in a selector.
  estimatedFeesPerGas,
  networkSettings,
  onNetworkSettingsChange,
  onSave,
}: NetworkSettingsSelectProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const [gasOptions, setGasOptions] = useState<GasOption[]>([])
  const customGas = useBackgroundSelector((state) => {
    return state.transactionConstruction.customFeesPerGas
  })

  const [activeFeeIndex, setActiveFeeIndex] = useState(0)
  const [currentlySelectedType, setCurrentlySelectedType] = useState(
    networkSettings.feeType
  )

  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const mainCurrencyPricePoint = useBackgroundSelector(
    selectTransactionMainCurrencyPricePoint
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
        onSave={onSave}
      />
    )
  }

  return (
    <div className="fees standard_width">
      <span className="settings_label network_fee_label">
        Network fees (Gwei)
      </span>
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
        {transactionDetails?.annotation?.warnings?.includes(
          "insufficient-funds"
        ) && (
          <SharedBanner icon="notif-attention" iconColor="var(--attention)">
            <span className="warning_text">
              Not enough {transactionDetails.network.baseAsset.symbol} for
              network fees
            </span>
          </SharedBanner>
        )}
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
                  // @TODO Consider nontypical gas minimums when adding networks
                  if (parsed < 21000n) {
                    return {
                      error: "Gas Limit must be higher than 21000",
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
          .settings_label {
            color: var(--green-5);
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
          }
          .network_fee_label {
            width: 100%;
            display: block;
            margin-bottom: 10px;
          }
          .max_fee {
            display: flex;
            flex-flow: column;
            margin-right: 10px;
            align-items: flex-end;
          }
          .price {
            width: 176px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: right;
          }
          .max_label {
            font-size: 14px;
            color: var(--green-40);
          }
          .info {
            display: flex;
            justify-content: space-between;
            align-items: center;
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
          .warning_text {
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
