import { isAddress } from "@ethersproject/address"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import {
  selectGasEstimates,
  updateTransactionOptions,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useLocation } from "react-router-dom"
import CorePage from "../components/Core/CorePage"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedInput from "../components/Shared/SharedInput"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import { useBackgroundSelector } from "../hooks"

interface SendLocationState {
  token: {
    name: string
  }
}
interface GasOption {
  name: string
  time: string
  gwei: number
  dollarValue: string
  maxFeePerGas: bigint | undefined
  maxPriorityFeePerGas: bigint | undefined
}

export default function Send(): ReactElement {
  const location = useLocation<SendLocationState>()
  const token = location?.state?.token?.name

  const [selectedCount, setSelectedCount] = useState(0)
  const [destinationAddress, setDestinationAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [activeFeeIndex, setActiveFeeIndex] = useState(0)
  const [minGas, setMinGas] = useState(0)
  const [maxGas, setMaxGas] = useState(0)
  const [selectedGas, setSelectedGas] = useState<GasOption>()
  const [gasOptions, setGasOptions] = useState<GasOption[]>([])
  const [gasLimit, setGasLimit] = useState("")

  const gas = useSelector(selectGasEstimates)

  const dispatch = useDispatch()

  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const saveUserGasChoice = () => {
    setSelectedGas(gasOptions[activeFeeIndex])
    setFeeModalOpen(false)
  }

  // TODO trigger update when redux state change

  const openSelectFeeModal = () => {
    setFeeModalOpen(true)
  }
  const closeSelectFeeModal = () => {
    setActiveFeeIndex(gasOptions.findIndex((el) => el === selectedGas) || 0)
    setFeeModalOpen(false)
  }

  const sendTransactionRequest = async () => {
    const transaction = {
      from: Object.keys(accountData)[0],
      to: destinationAddress,
      value: BigInt(amount),
      maxFeePerGas: selectedGas?.maxFeePerGas,
      maxPriorityFeePerGas: selectedGas?.maxPriorityFeePerGas,
      gasLimit: BigInt(gasLimit),
    }
    dispatch(updateTransactionOptions(transaction))
  }
  // TODO show the gasTimout bar in network fees
  // I mean how do i know when its going to refresh when I enter this screen

  const updateGasOptions = useCallback(() => {
    if (gas) {
      const instant = gas.estimatedPrices.find((el) => el.confidence === 99)
      const express = gas.estimatedPrices.find((el) => el.confidence === 90)
      const regular = gas.estimatedPrices.find((el) => el.confidence === 70)
      if (!!instant && !!express && !!regular) {
        const updatedGasOptions = [
          {
            name: "Regular",
            time: "~10 Min",
            gwei: Number(gas?.baseFeePerGas / 1000000000n),
            dollarValue: "$??",
            maxFeePerGas: BigInt(regular.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(regular.maxPriorityFeePerGas),
          },
          {
            name: "Express",
            time: "~2 Min",
            gwei: Number(BigInt(express.maxFeePerGas) / 1000000000n),
            dollarValue: "$??",
            maxFeePerGas: BigInt(express.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(express.maxPriorityFeePerGas),
          },
          {
            name: "Instant",
            time: "~15 Sec",
            gwei: Number(BigInt(instant.maxFeePerGas) / 1000000000n),
            dollarValue: "$??",
            maxFeePerGas: BigInt(instant.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(instant.maxPriorityFeePerGas),
          },
        ]
        setGasOptions(updatedGasOptions)
        setSelectedGas(updatedGasOptions[0])
      }
    }
  }, [gas])

  const findMinMaxGas = useCallback(() => {
    if (gas) {
      const values = gas.estimatedPrices.map((el) =>
        Number(BigInt(el.maxFeePerGas) / 1000000000n)
      )
      setMinGas(Number(gas?.baseFeePerGas / 1000000000n))
      setMaxGas(Math.max(...values) + 40)
    }
  }, [gas])

  useEffect(() => {
    findMinMaxGas()
    updateGasOptions()
  }, [gas, findMinMaxGas, updateGasOptions])

  // When gas updates, we select the regular gasOption as default
  useEffect(() => {
    setActiveFeeIndex(gasOptions.findIndex((el) => el === selectedGas) || 0)
  }, [gasOptions, selectedGas])

  useEffect(() => {
    if (token) {
      setSelectedCount(1)
    }
  }, [token])

  const handleSelectGasOption = (index: number) => {
    setActiveFeeIndex(index)
  }

  const NetworkFeesChooser = (
    <div className="wrapper">
      <div className="fees">
        <div className="fees__title">Network Fees</div>
        <div className="fees__divider" />
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
            background: #33514e;
            opacity: 0.6;
            border-radius: 4px;
            height: 2px;
            width: 384px;
            position: relative;
            left: -16px;
            margin: 12px 0;
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

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          size="custom"
          isOpen={feeModalOpen}
          close={closeSelectFeeModal}
          customSize={`${gasOptions.length * 56 + 320}px`}
        >
          {NetworkFeesChooser}
        </SharedSlideUpMenu>
        <div className="standard_width">
          <h1 className="header">
            <span className="icon_activity_send_medium" />
            <div className="title">Send Asset</div>
          </h1>
          <div className="form">
            <div className="form_input">
              <SharedAssetInput
                label="Asset / Amount"
                onAssetSelected={() => {
                  setSelectedCount(1)
                }}
                onAmountChanged={setAmount}
                defaultToken={{ symbol: token, name: token }}
                amount={amount}
              />
            </div>
            <div className="form_input">
              <SharedAssetInput
                isTypeDestination
                label="Send To:"
                onSendToAddressChange={setDestinationAddress}
              />
            </div>
            <div className="network_fee">
              <p>Estimated network fee</p>
              <button
                className="network_fee__settings"
                type="button"
                onClick={openSelectFeeModal}
                style={{
                  background: `linear-gradient(90deg, var(--green-80) ${(
                    ((selectedGas?.gwei || minGas) / maxGas) *
                    100
                  ).toFixed()}%, rgba(0, 0, 0, 0) ${(
                    ((selectedGas?.gwei || minGas) / maxGas) *
                    100
                  ).toFixed()}%)`,
                }}
              >
                <div>~{selectedGas?.gwei || minGas}Gwei</div>
                <img
                  className="network_fee__settings__image"
                  src="./images/cog@2x.png"
                  alt=""
                />
              </button>
            </div>
            <div className="divider" />
            <div className="total_footer standard_width_padded">
              <div className="total_amount">
                <div className="total_label">Total</div>
                <div className="total_amount_number">{`${
                  amount || 0
                } ${token}`}</div>
              </div>
              <SharedButton
                type="primary"
                size="large"
                isDisabled={
                  selectedCount <= 0 ||
                  BigInt(amount) === BigInt(0) ||
                  !isAddress(destinationAddress)
                }
                linkTo={{
                  pathname: "/signTransaction",
                  state: {
                    token,
                    amount,
                    // ! what is speed
                    speed: 10,
                    network: "mainnet",
                    to: destinationAddress,
                    signType: "sign",
                  },
                }}
                onClick={sendTransactionRequest}
              >
                Send
              </SharedButton>
            </div>
          </div>
        </div>
      </CorePage>
      <style jsx>
        {`
          .icon_activity_send_medium {
            background: url("./images/activity_send_medium@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .network_fee {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            line-height: 16px;
            color: var(--green-40);
            margin-bottom: 12px;
          }
          .network_fee__settings {
            height: 38px;
            display: flex;
            align-items: center;
            color: var(--gold-5);
            font-size: 16px;
            line-height: 24px;
            border-radius: 4px;
            padding-left: 8px;
            border: 1px solid #33514e;
          }
          .network_fee__settings__image {
            width: 14px;
            height: 14px;
            padding: 0 8px;
          }
          .title {
            width: 113px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
          }
          .form_input {
            margin-bottom: 22px;
          }

          .label_right {
            margin-right: 6px;
          }
          .total_amount_number {
            width: 150px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .total_footer {
            display: flex;
            justify-content: space-between;
            margin-top: 21px;
            padding-bottom: 20px;
          }
          .total_label {
            width: 33px;
            height: 17px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .divider {
            width: 384px;
            border-bottom: 1px solid #000000;
            margin-left: -16px;
          }
          .label {
            margin-bottom: 6px;
          }
        `}
      </style>
    </>
  )
}
