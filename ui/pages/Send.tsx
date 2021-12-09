import { isAddress } from "@ethersproject/address"
import { formatUnits } from "@ethersproject/units"
import { BlockEstimate } from "@tallyho/tally-background/networks"
import {
  selectAccountAndTimestampedActivities,
  selectCurrentAccountBalances,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  selectEstimatedFeesPerGas,
  updateTransactionOptions,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { utils } from "ethers"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import CorePage from "../components/Core/CorePage"
import NetworkFeesChooser from "../components/NetworkFees/NetworkFeesChooser"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

export default function Send(): ReactElement {
  const location = useLocation<{ symbol: string }>()
  const assetSymbol = location?.state?.symbol

  const [selectedCount, setSelectedCount] = useState(0)
  const [destinationAddress, setDestinationAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [minGas, setMinGas] = useState(0)
  const [maxGas, setMaxGas] = useState(0)
  const [currentFeeValues, setCurrentFeeValues] = useState({
    gwei: "",
    fiat: "",
  })
  const [selectedEstimatedFeePerGas, setSelectedEstimatedFeePerGas] =
    useState<BlockEstimate>({
      confidence: 0,
      maxFeePerGas: 0n,
      maxPriorityFeePerGas: 0n,
      price: 0n,
    })
  const [gasLimit, setGasLimit] = useState("")

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const dispatch = useBackgroundDispatch()

  const currentAccount = useBackgroundSelector(({ ui }) => ui.currentAccount)

  const balanceData = useBackgroundSelector(selectCurrentAccountBalances)

  const { assetAmounts } = balanceData ?? {
    assetAmounts: [],
  }
  const getTotalLocalizedValue = () => {
    const pricePerUnit = assetAmounts.find(
      (el) => el.asset.symbol === assetSymbol
    )?.unitPrice
    if (pricePerUnit) {
      return (Number(amount) * pricePerUnit).toFixed(2)
    }
    return 0
  }
  const findBalance = () => {
    return assetAmounts.find((el) => el.asset.symbol === assetSymbol)
      ?.localizedDecimalAmount
  }

  // TODO sets the value of the balance using comma and it should display decimal point for consistency
  const setMaxBalance = () => {
    const balance = findBalance()
    if (balance) {
      setAmount(balance)
    }
  }

  const openSelectFeeModal = () => {
    setFeeModalOpen(true)
  }
  const closeSelectFeeModal = () => {
    setFeeModalOpen(false)
  }

  const sendTransactionRequest = async () => {
    const transaction = {
      from: currentAccount.address,
      to: destinationAddress,
      // eslint-disable-next-line no-underscore-dangle
      value: BigInt(utils.parseEther(amount?.toString())._hex),
      maxFeePerGas: selectedEstimatedFeePerGas?.maxFeePerGas,
      maxPriorityFeePerGas: selectedEstimatedFeePerGas?.maxPriorityFeePerGas,
      gasLimit: BigInt(gasLimit),
    }
    dispatch(updateTransactionOptions(transaction))
  }

  // TODO Once we know what do we consider min and max gas this should be updated
  const findMinMaxGas = useCallback(() => {
    if (
      estimatedFeesPerGas?.baseFeePerGas &&
      estimatedFeesPerGas?.regular?.maxPriorityFeePerGas &&
      estimatedFeesPerGas?.instant?.maxPriorityFeePerGas
    ) {
      setMinGas(
        Number(
          formatUnits(
            (estimatedFeesPerGas.baseFeePerGas * BigInt(13)) / 10n +
              estimatedFeesPerGas.regular?.maxPriorityFeePerGas,
            "gwei"
          ).split(".")[0]
        )
      )
      setMaxGas(
        Number(
          formatUnits(
            (estimatedFeesPerGas.baseFeePerGas * BigInt(18)) / 10n +
              estimatedFeesPerGas.instant?.maxPriorityFeePerGas,
            "gwei"
          ).split(".")[0]
        )
      )
    }
  }, [estimatedFeesPerGas])

  useEffect(() => {
    findMinMaxGas()
  }, [findMinMaxGas])

  useEffect(() => {
    if (assetSymbol) {
      setSelectedCount(1)
    }
  }, [assetSymbol])

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          size="custom"
          isOpen={feeModalOpen}
          close={closeSelectFeeModal}
          customSize={`${3 * 56 + 320}px`}
        >
          <NetworkFeesChooser
            setFeeModalOpen={setFeeModalOpen}
            onSelectFeeOption={setSelectedEstimatedFeePerGas}
            currentFeeSelectionPrice={setCurrentFeeValues}
            selectedGas={selectedEstimatedFeePerGas}
            gasLimit={gasLimit}
            setGasLimit={setGasLimit}
            estimatedFeesPerGas={estimatedFeesPerGas}
          />
        </SharedSlideUpMenu>
        <div className="standard_width">
          <h1 className="header">
            <span className="icon_activity_send_medium" />
            <div className="title">Send Asset</div>
          </h1>
          <div className="form">
            <div className="form_input">
              <div className="balance">
                Balance: {findBalance()}{" "}
                <span
                  className="max"
                  onClick={setMaxBalance}
                  role="button"
                  tabIndex={0}
                  onKeyDown={() => {}}
                >
                  Max
                </span>
              </div>
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
                    ((Number(currentFeeValues.gwei) || minGas) / maxGas) *
                    100
                  ).toFixed()}%, rgba(0, 0, 0, 0) ${(
                    ((Number(currentFeeValues.gwei) || minGas) / maxGas) *
                    100
                  ).toFixed()}%)`,
                }}
              >
                <div>
                  ~{currentFeeValues.gwei || minGas}
                  Gwei
                </div>
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
                <div className="total_amount_number">
                  {`${amount || 0} ${assetSymbol ?? ""}`}
                  <div className="total_localized">
                    {amount ? `$${getTotalLocalizedValue()}` : ""}
                  </div>
                </div>
              </div>
              <SharedButton
                type="primary"
                size="large"
                isDisabled={
                  selectedCount <= 0 ||
                  Number(amount) === 0 ||
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
          .balance {
            color: var(--green-40);
            text-align: right;
            position: relative;
            font-size: 14px;
            top: 16px;
            right: 0;
          }
          .max {
            color: #d08e39;
            cursor: pointer;
          }
          .total_localized {
            color: var(--green-60);
            font-size: 12px;
            line-height: 16px;
          }
        `}
      </style>
    </>
  )
}
