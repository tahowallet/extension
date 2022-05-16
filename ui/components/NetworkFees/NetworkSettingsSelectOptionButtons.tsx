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
      Miner:
      {`${option.maxPriorityGwei}`}
      <div className="option_right">
        Max Base:
        <div className="price">{`${option.baseMaxGwei}`}</div>
      </div>
      <style jsx>{`
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
          gap: 4px;
        }
        .option_left {
          text-align: left;
          flex-direction: column;
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
      <div className="input_wrap">
        <SharedInput
          label="Miner"
          value={`${option.maxPriorityGwei}`}
          onChange={(value: string) => {
            updateCustomGas(
              option.baseMaxFeePerGas,
              gweiFloatToWei(parseFloat(value))
            )
          }}
        />
      </div>
      <div className="option_right">
        <div className="input_wrap">
          <SharedInput
            value={`${option.baseMaxGwei}`}
            label="Max Base"
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
            0px 6px 8px rgba(0, 20, 19, 0.24), 0px 2px 4px rgba(0, 20, 19, 0.34);
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
        .currently_selected {
          color: var(--success);
          opacity: 0.8;
          font-size: 10px;
        }
      `}</style>
    </button>
  )
}
