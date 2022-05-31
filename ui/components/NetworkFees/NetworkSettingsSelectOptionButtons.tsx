import React, { ReactElement } from "react"
import { GasOption } from "@tallyho/tally-background/redux-slices/transaction-construction"
import capitalize from "../../utils/capitalize"
import SharedInput, { SharedTypedInput } from "../Shared/SharedInput"

function gweiFloatToWei(float: number): bigint {
  return (BigInt(float * 100) / 100n) * BigInt(1000000000)
}

export function NetworkSettingsSelectOptionButton({
  option,
  handleSelectGasOption,
  isActive,
}: {
  option: GasOption
  handleSelectGasOption: () => void
  isActive: boolean
}): ReactElement {
  return (
    <button
      key={option.confidence}
      className={`option ${isActive ? "active" : ""}`}
      onClick={handleSelectGasOption}
      type="button"
    >
      <div className="option_left">
        <div className="name">{capitalize(option.type)}</div>
        <div className="subtext">{option.estimatedSpeed}</div>
      </div>
      <span className="subtext_large miner">
        Miner:
        {`${option.maxPriorityGwei}`}
      </span>
      <div className="option_right">
        <span className="subtext_large">Max Base: </span>
        <div className="price">{` ${option.baseMaxGwei}`}</div>
      </div>
      <style jsx>{`
        .subtext_large {
          font-weight: 500;
          font-size: 16px;
          color: var(--green-40);
        }
        .option {
          width: 100%;
          height: 56px;
          padding: 0px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--hunter-green);
          box-sizing: border-box;
          margin: 8px 0;
          cursor: pointer;
          border-radius: 4px;
          border: 1px solid transparent;
          position: relative;
        }
        .option.active {
          border-color: var(--success);
          box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
            0px 6px 8px rgba(0, 20, 19, 0.24), 0px 2px 4px rgba(0, 20, 19, 0.34);
        }
        .option.active .name {
          color: var(--success);
        }
        .option_left,
        .option_right {
          display: flex;
        }
        .option_left {
          text-align: left;
          flex-direction: column;
          width: 70px;
        }
        .name,
        .price {
          color: var(--green--5);
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
        .currently_selected {
          color: var(--success);
          opacity: 0.8;
          font-size: 10px;
        }
      `}</style>
    </button>
  )
}

export function NetworkSettingsSelectOptionButtonCustom({
  option,
  handleSelectGasOption,
  isActive,
  updateCustomGas,
}: {
  option: GasOption
  handleSelectGasOption: () => void
  isActive: boolean
  updateCustomGas: (
    customMaxBaseFee: bigint,
    customMaxPriorityFeePerGas: bigint
  ) => void
}): ReactElement {
  return (
    <button
      key={option.confidence}
      className={`option ${isActive ? "active" : ""}`}
      onClick={handleSelectGasOption}
      type="button"
    >
      <div className="option_left">
        <div className="name">{capitalize(option.type)}</div>
      </div>
      <span className="subtext_large">Miner:</span>

      <div className="input_wrap">
        <SharedInput
          value={`${option.maxPriorityGwei}`}
          isSmall
          onChange={(value: string) => {
            updateCustomGas(
              option.baseMaxFeePerGas,
              gweiFloatToWei(parseFloat(value))
            )
          }}
        />
      </div>
      <div className="option_right">
        <span className="subtext_large">Max Base:</span>
        <div className="input_wrap">
          <SharedInput
            value={`${option.baseMaxGwei}`}
            isSmall
            onChange={(value: string) => {
              updateCustomGas(
                gweiFloatToWei(parseFloat(value)), // @TODO Replace
                option.maxPriorityFeePerGas
              )
            }}
          />
        </div>
      </div>
      <style jsx>{`
        .option {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--hunter-green);
          box-sizing: border-box;
          padding: 15px;
          margin: 8px 0;
          cursor: pointer;
          border-radius: 4px;
          border: 1px solid transparent;
          position: relative;
        }
        .option.active {
          border-color: var(--success);
          box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
            0px 6px 8px rgba(0, 20, 19, 0.24), 0px 2px 4px rgba(0, 20, 19, 0.34);
        }
        .option.active .name {
          color: var(--success);
        }
        .option_left,
        .option_right {
          display: flex;
        }
        .option_left {
          text-align: left;
          flex-direction: column;
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
        .currently_selected {
          color: var(--success);
          opacity: 0.8;
          font-size: 10px;
        }

        .subtext_large {
          font-weight: 500;
          font-size: 16px;
          color: var(--green-40);
        }
        .option {
          width: 100%;
          height: 56px;
          padding: 0px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--hunter-green);
          box-sizing: border-box;
          margin: 8px 0;
          cursor: pointer;
          border-radius: 4px;
          border: 1px solid transparent;
          position: relative;
        }
        .option.active {
          border-color: var(--success);
          box-shadow: 0px 16px 16px rgba(0, 20, 19, 0.14),
            0px 6px 8px rgba(0, 20, 19, 0.24), 0px 2px 4px rgba(0, 20, 19, 0.34);
        }
        .option.active .name {
          color: var(--success);
        }
        .option_left,
        .option_right {
          display: flex;
          align-items: center;
        }
        .option_left {
          text-align: left;
          flex-direction: column;
          width: 70px;
        }
        .name,
        .price {
          color: var(--green--5);
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
        .currently_selected {
          color: var(--success);
          opacity: 0.8;
          font-size: 10px;
        }
      `}</style>
    </button>
  )
}
