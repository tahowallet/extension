import { selectLastGasEstimatesRefreshTime } from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useSelector } from "react-redux"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"

interface GasOption {
  name: string
  time: string
  gwei: number
  dollarValue: string
  maxFeePerGas: bigint | undefined
  maxPriorityFeePerGas: bigint | undefined
}

interface NetworkFeesChooserProps {
  gasOptions: GasOption[]
  activeFeeIndex: number
  handleSelectGasOption: (number: number) => void
  gasLimit: string | number
  setGasLimit: React.Dispatch<React.SetStateAction<string>>
  saveUserGasChoice: () => void
}

export default function NetworkFeesChooser({
  gasOptions,
  activeFeeIndex,
  handleSelectGasOption,
  gasLimit,
  setGasLimit,
  saveUserGasChoice,
}: NetworkFeesChooserProps): ReactElement {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const gasTime = useSelector(selectLastGasEstimatesRefreshTime)

  const getSecondsTillGasUpdate = useCallback((): ReturnType<
    typeof setTimeout
  > => {
    const now = new Date().getTime()
    setTimeRemaining(Number((120 - (now - gasTime) / 1000).toFixed()))
    const interval = setTimeout(getSecondsTillGasUpdate, 1000)
    return interval
  }, [gasTime])

  useEffect(() => {
    const interval = getSecondsTillGasUpdate()
    return () => {
      clearTimeout(interval)
    }
  })

  return (
    <div className="wrapper">
      <div className="fees">
        <div className="fees__title">Network Fees</div>
        <div className="fees__divider">
          <div className="fees__divider-background" />
          <div
            className="fees__divider-cover"
            style={{ left: (120 - timeRemaining) * (-384 / 120) }}
          />
        </div>
        {gasOptions.map((option, i) => {
          return (
            <button
              className={`fees__option ${i === activeFeeIndex ? "active" : ""}`}
              onClick={() => handleSelectGasOption(i)}
              type="button"
            >
              <div className="fees__option__left">
                <div className="fees__option__name">{option.name}</div>
                <div className="fees__option__subtext">{option.time}</div>
              </div>
              <div className="fees__option__right">
                <div className="fees__option__price">{`~${option.gwei} Gwei`}</div>
                <div className="fees__option__subtext">
                  {option.dollarValue}
                </div>
              </div>
            </button>
          )
        })}
        <div className="fees__limit">
          <label className="fees__limit__label" htmlFor="gasLimit">
            Gas limit
          </label>
          <SharedInput
            id="gasLimit"
            value={gasLimit}
            onChange={(val) => setGasLimit(val)}
            placeholder="Auto"
          />
        </div>
      </div>
      <div className="confirm">
        <SharedButton size="medium" type="primary" onClick={saveUserGasChoice}>
          Save
        </SharedButton>
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
          .fees__divider {
            border-radius: 4px;
            height: 2px;
            width: 384px;
            position: relative;
            left: -16px;
            margin: 12px 0;
          }
          .fees__divider-cover {
            background: #667c7a;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            position: absolute;
            transition: all 0.3s ease;
          }
          .fees__divider-background {
            background: #33514e;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            position: absolute;
            transition: all 0.3s ease;
          }
          .fees__limit {
            margin: 16px 0;
            width: 40%;
            position: relative;
          }
          .fees__limit__label {
            position: absolute;
            top: -8px;
            left: 10px;
            font-size: 12px;
            padding: 0 4px;
            background-color: var(--green-95);
            color: #99a8a7;
          }
          .fees__title {
            font-size: 22px;
            font-weight: 600;
          }
          .fees__option {
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
          .fees__option.active {
            border: 1px solid #22c480;
            box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
              0px 6px 8px rgba(0, 20, 19, 0.24),
              0px 2px 4px rgba(0, 20, 19, 0.34);
          }
          .fees__option.active .fees__option__name {
            color: #22c480;
          }
          .fees__option__left,
          .fees__option__right {
            display: flex;
            flex-flow: column;
            gap: 4px;
          }
          .fees__option__left {
            text-align: left;
          }
          .fees__option__right {
            text-align: right;
          }
          .fees__option__name,
          .fees__option__price {
            color: var(--green--5);
            font-size: 18px;
            font-weight: 600;
          }
          .fees__option__subtext {
            color: var(--green-60);
            font-size: 14px;
          }
          .confirm {
            width: 100%;
            background: #002522;
            display: flex;
            box-sizing: border-box;
            justify-content: flex-end;
            padding: 20px 16px;
          }
        `}
      </style>
    </div>
  )
}
