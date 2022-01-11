import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { isAddress } from "@ethersproject/address"
import { formatEther } from "@ethersproject/units"
import {
  selectCurrentAccount,
  selectCurrentAccountBalances,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  broadcastOnSign,
  NetworkFeeSetting,
  selectEstimatedFeesPerGas,
  setFeeType,
  updateTransactionOptions,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { utils } from "ethers"
import { useLocation } from "react-router-dom"
import NetworkSettingsChooser from "../components/NetworkFees/NetworkSettingsChooser"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedBackButton from "../components/Shared/SharedBackButton"
import SharedButton from "../components/Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import { SignType } from "./SignTransaction"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import FeeSettingsButton from "../components/NetworkFees/FeeSettingsButton"

export default function Send(): ReactElement {
  const location = useLocation<{ symbol: string }>()

  const [assetSymbol, setAssetSymbol] = useState(
    location?.state?.symbol || "ETH"
  )
  const [selectedCount, setSelectedCount] = useState(0)
  const [destinationAddress, setDestinationAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [currentBalance, setCurrentBalance] = useState("")
  const [gasLimit, setGasLimit] = useState("")
  const [hasError, setHasError] = useState(false)
  const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
    useState(false)

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)

  const dispatch = useBackgroundDispatch()

  const currentAccount = useBackgroundSelector(selectCurrentAccount)

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
  const findBalance = useCallback(() => {
    const balance = formatEther(
      assetAmounts.find((el) => el.asset.symbol === assetSymbol)?.amount || "0"
    )
    setCurrentBalance(balance)
  }, [assetAmounts, assetSymbol])

  const setMaxBalance = () => {
    if (currentBalance) {
      setAmount(currentBalance)
    }
  }
  const sendTransactionRequest = async () => {
    dispatch(broadcastOnSign(true))
    const transaction = {
      from: currentAccount.address,
      to: destinationAddress,
      // eslint-disable-next-line no-underscore-dangle
      value: BigInt(utils.parseEther(amount?.toString())._hex),
      gasLimit: BigInt(gasLimit),
    }
    return dispatch(updateTransactionOptions(transaction))
  }

  useEffect(() => {
    findBalance()
  }, [findBalance])

  useEffect(() => {
    if (assetSymbol) {
      setSelectedCount(1)
    }
  }, [assetSymbol])

  const networkSettingsSaved = (networkSetting: NetworkFeeSetting) => {
    setGasLimit(networkSetting.gasLimit)
    dispatch(setFeeType(networkSetting.feeType))
    setNetworkSettingsModalOpen(false)
  }

  return (
    <>
      <div className="standard_width">
        <div className="back_button_wrap">
          <SharedBackButton />
        </div>
        <h1 className="header">
          <span className="icon_activity_send_medium" />
          <div className="title">Send Asset</div>
        </h1>
        <div className="form">
          <div className="form_input">
            <div className="balance">
              Balance: {`${currentBalance.substring(0, 8)}\u2026 `}
              <button
                type="button"
                className="max"
                onClick={setMaxBalance}
                tabIndex={0}
              >
                Max
              </button>
            </div>
            <SharedAssetInput
              label="Asset / Amount"
              onAssetSelect={(token) => {
                setAssetSymbol(token.symbol)
              }}
              assets={assetAmounts.map((asset) => {
                return {
                  symbol: asset.asset.symbol,
                  name: asset.asset.name,
                }
              })}
              onAmountChange={(value, errorMessage) => {
                setAmount(value)
                if (errorMessage) {
                  setHasError(true)
                } else {
                  setHasError(false)
                }
              }}
              defaultAsset={{ symbol: assetSymbol, name: assetSymbol }}
              amount={amount}
              maxBalance={Number(currentBalance)}
              disableDropdown
            />
            <div className="value">${getTotalLocalizedValue()}</div>
          </div>
          <div className="form_input">
            <SharedAssetInput
              isTypeDestination
              label="Send To:"
              onSendToAddressChange={setDestinationAddress}
            />
          </div>
          <SharedSlideUpMenu
            size="custom"
            isOpen={networkSettingsModalOpen}
            close={() => setNetworkSettingsModalOpen(false)}
            customSize="488px"
          >
            <NetworkSettingsChooser
              networkSettings={{
                estimatedFeesPerGas,
                gasLimit,
              }}
              onNetworkSettingsSave={networkSettingsSaved}
              visible={networkSettingsModalOpen}
            />
          </SharedSlideUpMenu>
          <div className="network_fee">
            <p>Estimated network fee</p>
            <FeeSettingsButton
              onClick={() => setNetworkSettingsModalOpen(true)}
            />
          </div>
          <div className="divider" />
          <div className="send_footer standard_width_padded">
            <SharedButton
              type="primary"
              size="large"
              isDisabled={
                selectedCount <= 0 ||
                Number(amount) === 0 ||
                !isAddress(destinationAddress) ||
                hasError
              }
              linkTo={{
                pathname: "/signTransaction",
                state: {
                  assetSymbol,
                  amount,
                  to: destinationAddress,
                  signType: SignType.SignTransfer,
                  value: getTotalLocalizedValue(),
                },
              }}
              onClick={sendTransactionRequest}
            >
              Send
            </SharedButton>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .icon_activity_send_medium {
            background: url("./images/activity_send_medium@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .title {
            width: 113px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .back_button_wrap {
            position: absolute;
            margin-left: -1px;
            margin-top: -4px;
            z-index: 10;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            margin-top: 30px;
          }
          .form_input {
            margin-bottom: 22px;
          }

          .label_right {
            margin-right: 6px;
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
          .value {
            display: flex;
            justify-content: flex-end;
            position: relative;
            top: -24px;
            right: 16px;
            color: var(--green-60);
            font-size: 12px;
            line-height: 16px;
          }
          .send_footer {
            display: flex;
            justify-content: flex-end;
            margin-top: 21px;
            padding-bottom: 20px;
          }
          .network_fee {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        `}
      </style>
    </>
  )
}
