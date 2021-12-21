import { formatUnits, formatEther } from "@ethersproject/units"
import { ESTIMATED_FEE_MULTIPLIERS } from "@tallyho/tally-background/constants/networkFees"
import { BlockEstimate } from "@tallyho/tally-background/networks"
import { selectMainCurrencyUnitPrice } from "@tallyho/tally-background/redux-slices/selectors"
import {
  EstimatedFeesPerGas,
  expressFeeType,
  instantFeeType,
  regularFeeType,
  selectFeeType,
  selectLastGasEstimatesRefreshTime,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import FeeSettingsButton from "./FeeSettingsButton"

type GasOption = {
  name: string
  confidence: string
  estimatedGwei: string
  maxGwei: string
  dollarValue: string
  price: bigint
  estimatedFeePerGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

interface NetworkFeesChooserProps {
  gasLimit: string
  setGasLimit: React.Dispatch<React.SetStateAction<string>>
  estimatedFeesPerGas: EstimatedFeesPerGas | undefined
}

export default function NetworkFeesChooser({
  gasLimit,
  setGasLimit,
  estimatedFeesPerGas,
}: NetworkFeesChooserProps): ReactElement {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [activeFeeIndex, setActiveFeeIndex] = useState(0)
  const [gasOptions, setGasOptions] = useState<GasOption[]>([])

  const dispatch = useDispatch()

  const gasTime = useBackgroundSelector(selectLastGasEstimatesRefreshTime)
  const selectedFeeType: string = useBackgroundSelector(selectFeeType)
  const ethUnitPrice = useBackgroundSelector(selectMainCurrencyUnitPrice)

  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const openSelectFeeModal = () => {
    setFeeModalOpen(true)
  }
  const closeSelectFeeModal = () => {
    setActiveFeeIndex(gasOptions.findIndex((el) => el.name === selectedFeeType))
    setFeeModalOpen(false)
  }

  const handleSelectGasOption = (index: number) => {
    setActiveFeeIndex(index)
  }
  const saveUserGasChoice = () => {
    switch (gasOptions[activeFeeIndex].name) {
      case "regular":
        dispatch(regularFeeType())
        break
      case "express":
        dispatch(expressFeeType())
        break
      case "instant":
        dispatch(instantFeeType())
        break
      default:
        break
    }
    setFeeModalOpen(false)
  }

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

  const [minFee, setMinFee] = useState(0)
  const [maxFee, setMaxFee] = useState(0)

  const updateGasOptions = useCallback(() => {
    const formatBlockEstimate = (option: BlockEstimate) => {
      const { confidence } = option
      const baseFee = estimatedFeesPerGas?.baseFeePerGas || 0n
      const feeOptionData: {
        name: { [key: number]: string }
      } = {
        name: {
          70: "regular",
          95: "express",
          99: "instant",
        },
      }
      const formatToGwei = (value: bigint) => {
        return formatUnits(value + option.maxPriorityFeePerGas, "gwei").split(
          "."
        )[0]
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
        name: feeOptionData.name[confidence],
        confidence: `${confidence}`,
        estimatedGwei: formatToGwei(
          (baseFee * ESTIMATED_FEE_MULTIPLIERS[confidence]) / 10n
        ),
        maxGwei: formatToGwei(option.maxFeePerGas),
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
          (el) => el.name === selectedFeeType
        )
        const currentlySelectedFeeIndex =
          selectedGasFeeIndex === -1 ? 0 : selectedGasFeeIndex
        const currentlySelectedFee = basePrices[currentlySelectedFeeIndex]

        setGasOptions(updatedGasOptions)

        setActiveFeeIndex(currentlySelectedFeeIndex)

        if (typeof currentlySelectedFee !== "undefined") {
          if (
            estimatedFeesPerGas?.baseFeePerGas &&
            estimatedFeesPerGas?.regular?.maxPriorityFeePerGas &&
            estimatedFeesPerGas?.instant?.maxPriorityFeePerGas
          ) {
            setMinFee(
              Number(
                formatUnits(
                  (estimatedFeesPerGas.baseFeePerGas * BigInt(13)) / 10n +
                    estimatedFeesPerGas.regular?.maxPriorityFeePerGas,
                  "gwei"
                ).split(".")[0]
              )
            )
            setMaxFee(
              Number(
                formatUnits(
                  (estimatedFeesPerGas.baseFeePerGas * BigInt(20)) / 10n +
                    estimatedFeesPerGas.instant?.maxPriorityFeePerGas,
                  "gwei"
                ).split(".")[0]
              )
            )
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFeesPerGas, gasLimit, ethUnitPrice])

  useEffect(() => {
    updateGasOptions()
  }, [updateGasOptions])

  const capitalize = (s: string) => {
    return s[0].toUpperCase() + s.slice(1)
  }

  return (
    <>
      <SharedSlideUpMenu
        size="custom"
        isOpen={feeModalOpen}
        close={closeSelectFeeModal}
        customSize={`${3 * 56 + 320}px`}
      >
        <div className="wrapper">
          <div className="fees">
            <div className="title">Network Fees</div>
            <div className="divider">
              <div className="divider-background" />
              <div
                className="divider-cover"
                style={{ left: -384 + (384 - timeRemaining * (384 / 120)) }}
              />
            </div>
            {gasOptions.map((option, i) => {
              return (
                <button
                  key={option.confidence}
                  className={`option ${i === activeFeeIndex ? "active" : ""}`}
                  onClick={() => handleSelectGasOption(i)}
                  type="button"
                >
                  <div className="option_left">
                    <div className="name">{capitalize(option.name)}</div>
                    <div className="subtext">
                      Probability: {option.confidence}%
                    </div>
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
                <label className="limit_label" htmlFor="gasLimit">
                  Gas limit
                </label>
                <SharedInput
                  id="gasLimit"
                  value={gasLimit}
                  onChange={(val) => setGasLimit(val)}
                  placeholder="21000"
                  type="number"
                />
              </div>
              <div className="max_fee">
                <span className="max_label">Max Fee</span>
                <div className="price">
                  {gasOptions?.[activeFeeIndex]?.maxGwei} Gwei
                </div>
              </div>
            </div>
          </div>
          <div className="confirm">
            <SharedButton
              size="medium"
              type="primary"
              onClick={saveUserGasChoice}
            >
              Save
            </SharedButton>
          </div>
        </div>
      </SharedSlideUpMenu>

      <div className="network_fee">
        <p>Estimated network fee</p>
        <FeeSettingsButton
          openModal={openSelectFeeModal}
          minFee={minFee}
          maxFee={maxFee}
          currentFeeSelected={gasOptions?.[activeFeeIndex]?.estimatedGwei ?? ""}
        />
      </div>

      <style jsx>
        {`
          .wrapper {
            height: 100%;
            display: flex;
            flex-flow: column;
            justify-content: space-between;
          }
          .fees {
            background-color: var(--green-95);
            width: 352px;
            margin: 0 auto;
            display: flex;
            flex-flow: column;
          }
          .divider {
            border-radius: 4px;
            height: 2px;
            width: 384px;
            position: relative;
            left: -16px;
            margin: 12px 0;
          }
          .divider-cover {
            background: #667c7a;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            position: absolute;
            transition: all 0.3s ease;
          }
          .divider-background {
            background: #33514e;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            position: absolute;
            transition: all 0.3s ease;
          }
          .limit {
            margin: 16px 0;
            width: 40%;
            position: relative;
          }
          .limit_label {
            position: absolute;
            top: -8px;
            left: 10px;
            font-size: 12px;
            padding: 0 4px;
            background-color: var(--green-95);
            color: var(--green-40);
          }
          .title {
            font-size: 22px;
            font-weight: 600;
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
          .confirm {
            width: 100%;
            display: flex;
            box-sizing: border-box;
            justify-content: flex-end;
            padding: 20px 16px;
          }
          .info {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .max_fee {
            display: flex;
            flex-flow: column;
            margin-right: 16px;
            align-items: flex-end;
          }
          .max_label {
            font-size: 14px;
            color: var(--green-40);
          }
          .network_fee {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            line-height: 16px;
            color: var(--green-40);
            margin-bottom: 12px;
          }
        `}
      </style>
    </>
  )
}
