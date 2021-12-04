import { isAddress } from "@ethersproject/address"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors"
import {
  selectEstimatedFeesPerGas,
  updateTransactionOptions,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import CorePage from "../components/Core/CorePage"
import NetworkFeesChooser from "../components/NetworkFees/Chooser"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

type GasOption = {
  name: string
  confidence: string
  gwei: number
  dollarValue: string
  maxFeePerGas: bigint | undefined
  maxPriorityFeePerGas: bigint | undefined
}

export default function Send(): ReactElement {
  const location = useLocation<{ symbol: string }>()
  const assetSymbol = location?.state?.symbol

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

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const dispatch = useBackgroundDispatch()

  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const saveUserGasChoice = () => {
    setSelectedGas(gasOptions[activeFeeIndex])
    setFeeModalOpen(false)
  }

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

  const updateGasOptions = useCallback(() => {
    if (estimatedFeesPerGas) {
      const instant = estimatedFeesPerGas?.instant
      const express = estimatedFeesPerGas?.express
      const regular = estimatedFeesPerGas?.regular
      if (!!instant && !!express && !!regular) {
        const updatedGasOptions = [
          {
            name: "Regular",
            confidence: `${regular.confidence}%`,
            gwei: Number(
              (BigInt(regular.maxFeePerGas) +
                BigInt(regular.maxPriorityFeePerGas)) /
                1000000000n
            ),
            dollarValue: "$??",
            maxFeePerGas: BigInt(regular.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(regular.maxPriorityFeePerGas),
          },
          {
            name: "Express",
            confidence: `${express.confidence}%`,
            gwei: Number(
              (BigInt(express.maxFeePerGas) +
                BigInt(express.maxPriorityFeePerGas)) /
                1000000000n
            ),
            dollarValue: "$??",
            maxFeePerGas: BigInt(express.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(express.maxPriorityFeePerGas),
          },
          {
            name: "Instant",
            confidence: `${instant.confidence}%`,
            gwei: Number(
              (BigInt(instant.maxFeePerGas) +
                BigInt(instant.maxPriorityFeePerGas)) /
                1000000000n
            ),
            dollarValue: "$??",
            maxFeePerGas: BigInt(instant.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(instant.maxPriorityFeePerGas),
          },
        ]
        setGasOptions(updatedGasOptions)
        setSelectedGas(updatedGasOptions[0])
      }
    }
  }, [estimatedFeesPerGas])

  const findMinMaxGas = useCallback(() => {
    if (estimatedFeesPerGas) {
      setMinGas(Number(estimatedFeesPerGas?.baseFeePerGas / 1000000000n))
      setMaxGas(
        Number(estimatedFeesPerGas.instant?.maxFeePerGas) / Number(1000000000n)
      )
    }
  }, [estimatedFeesPerGas])

  useEffect(() => {
    findMinMaxGas()
    updateGasOptions()
  }, [estimatedFeesPerGas, findMinMaxGas, updateGasOptions])

  // When estimatedFeesPerGas updates, we select the regular gasOption as default
  useEffect(() => {
    setActiveFeeIndex(gasOptions.findIndex((el) => el === selectedGas) || 0)
  }, [gasOptions, selectedGas])

  useEffect(() => {
    if (assetSymbol) {
      setSelectedCount(1)
    }
  }, [assetSymbol])

  const handleSelectGasOption = (index: number) => {
    setActiveFeeIndex(index)
  }

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          size="custom"
          isOpen={feeModalOpen}
          close={closeSelectFeeModal}
          customSize={`${gasOptions.length * 56 + 320}px`}
        >
          {feeModalOpen ? (
            <NetworkFeesChooser
              gasOptions={gasOptions}
              activeFeeIndex={activeFeeIndex}
              handleSelectGasOption={handleSelectGasOption}
              gasLimit={gasLimit}
              setGasLimit={setGasLimit}
              saveUserGasChoice={saveUserGasChoice}
            />
          ) : (
            <></>
          )}
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
                onAssetSelect={() => {
                  setSelectedCount(1)
                }}
                onAmountChange={setAmount}
                defaultToken={{ symbol: assetSymbol, name: assetSymbol }}
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
                className="settings"
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
                  className="settings_image"
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
                } ${assetSymbol}`}</div>
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
                    assetSymbol,
                    amount,
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
          .settings {
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
          .settings_image {
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
