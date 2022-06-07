import React, { ReactElement, useCallback, useState } from "react"
import {
  selectCurrentAccount,
  selectCurrentAccountBalances,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  NetworkFeeSettings,
  setFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { selectEstimatedFeesPerGas } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  FungibleAsset,
  isFungibleAssetAmount,
} from "@tallyho/tally-background/assets"
import { ETH } from "@tallyho/tally-background/constants"
import {
  convertFixedPointNumber,
  parseToFixedPointNumber,
} from "@tallyho/tally-background/lib/fixed-point"
import {
  selectAssetPricePoint,
  transferAsset,
} from "@tallyho/tally-background/redux-slices/assets"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { useHistory, useLocation } from "react-router-dom"
import classNames from "classnames"
import NetworkSettingsChooser from "../components/NetworkFees/NetworkSettingsChooser"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedBackButton from "../components/Shared/SharedBackButton"
import SharedButton from "../components/Shared/SharedButton"
import {
  useAddressOrNameValidation,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import FeeSettingsButton from "../components/NetworkFees/FeeSettingsButton"
import SharedLoadingSpinner from "../components/Shared/SharedLoadingSpinner"
import t from "../utils/i18n"

export default function Send(): ReactElement {
  const location = useLocation<FungibleAsset>()
  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? ETH
  )
  const [destinationAddress, setDestinationAddress] = useState<
    string | undefined
  >(undefined)
  const [amount, setAmount] = useState("")
  const [gasLimit, setGasLimit] = useState<bigint | undefined>(undefined)
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)
  const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
    useState(false)

  const history = useHistory()

  const dispatch = useBackgroundDispatch()
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const balanceData = useBackgroundSelector(selectCurrentAccountBalances)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)

  const fungibleAssetAmounts =
    // Only look at fungible assets.
    balanceData?.assetAmounts?.filter(
      (assetAmount): assetAmount is CompleteAssetAmount<FungibleAsset> =>
        isFungibleAssetAmount(assetAmount)
    )
  const assetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(
      state.assets,
      selectedAsset.symbol,
      mainCurrencySymbol
    )
  )

  const assetAmountFromForm = () => {
    const fixedPointAmount = parseToFixedPointNumber(amount.toString())
    if (typeof fixedPointAmount === "undefined") {
      return undefined
    }

    const decimalMatched = convertFixedPointNumber(
      fixedPointAmount,
      selectedAsset.decimals
    )

    return enrichAssetAmountWithMainCurrencyValues(
      {
        asset: selectedAsset,
        amount: decimalMatched.amount,
      },
      assetPricePoint,
      2
    )
  }

  const assetAmount = assetAmountFromForm()

  const sendTransactionRequest = useCallback(async () => {
    if (assetAmount === undefined || destinationAddress === undefined) {
      return
    }

    try {
      setIsSendingTransactionRequest(true)

      await dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: destinationAddress,
            network: currentAccount.network,
          },
          assetAmount,
          gasLimit,
        })
      )
    } finally {
      setIsSendingTransactionRequest(false)
    }

    history.push("/singleAsset", assetAmount.asset)
  }, [
    assetAmount,
    currentAccount,
    destinationAddress,
    dispatch,
    gasLimit,
    history,
  ])

  const networkSettingsSaved = (networkSetting: NetworkFeeSettings) => {
    setGasLimit(networkSetting.gasLimit)
    dispatch(setFeeType(networkSetting.feeType))
    setNetworkSettingsModalOpen(false)
  }

  const {
    errorMessage: addressErrorMessage,
    isValidating: addressIsValidating,
    handleInputChange: handleAddressChange,
  } = useAddressOrNameValidation((value) =>
    setDestinationAddress(value?.address)
  )

  return (
    <>
      <div className="standard_width">
        <div className="back_button_wrap">
          <SharedBackButton path="/" />
        </div>
        <h1 className="header">
          <span className="icon_activity_send_medium" />
          <div className="title">{t("walletSendAsset")}</div>
        </h1>
        <div className="form">
          <div className="form_input">
            <SharedAssetInput
              label={t("walletAssetAmount")}
              onAssetSelect={setSelectedAsset}
              assetsAndAmounts={fungibleAssetAmounts}
              onAmountChange={(value, errorMessage) => {
                setAmount(value)
                if (errorMessage) {
                  setHasError(true)
                } else {
                  setHasError(false)
                }
              }}
              selectedAsset={selectedAsset}
              amount={amount}
            />
            <div className="value">
              ${assetAmount?.localizedMainCurrencyAmount ?? "-"}
            </div>
          </div>
          <div className="form_input send_to_field">
            <label htmlFor="send_address">{t("walletSendTo")}</label>
            <input
              id="send_address"
              type="text"
              placeholder="0x..."
              spellCheck={false}
              onChange={(event) => handleAddressChange(event.target.value)}
              className={classNames({
                error: addressErrorMessage !== undefined,
              })}
            />
            {addressIsValidating ? (
              <p className="validating">
                <SharedLoadingSpinner />
              </p>
            ) : (
              <></>
            )}
            {addressErrorMessage !== undefined ? (
              <p className="error">{addressErrorMessage}</p>
            ) : (
              <></>
            )}
          </div>
          <SharedSlideUpMenu
            size="custom"
            isOpen={networkSettingsModalOpen}
            close={() => setNetworkSettingsModalOpen(false)}
            customSize="488px"
          >
            <NetworkSettingsChooser
              estimatedFeesPerGas={estimatedFeesPerGas}
              onNetworkSettingsSave={networkSettingsSaved}
            />
          </SharedSlideUpMenu>
          <div className="network_fee">
            <p>{t("walletEstimatedFee")}</p>
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
                Number(amount) === 0 ||
                destinationAddress === undefined ||
                hasError
              }
              onClick={sendTransactionRequest}
              isFormSubmit
              isLoading={isSendingTransactionRequest}
            >
              {t("walletSendButton")}
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
          div.send_to_field {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: space-between;
          }
          div.send_to_field label {
            color: var(--green-40);
            text-align: right;
            font-size: 14px;
          }
          input#send_address {
            box-sizing: border-box;
            height: 72px;
            width: 100%;

            font-size: 22px;
            font-weight: 500;
            line-height: 72px;
            color: #fff;

            border-radius: 4px;
            background-color: var(--green-95);
            padding: 0px 16px;
          }
          input#send_address ~ .error {
            color: var(--error);
            font-weight: 500;
            font-size: 14px;
            line-height: 20px;
            align-self: flex-end;
            text-align: end;
            margin-top: -25px;
            margin-right: 15px;
            margin-bottom: 5px;
          }
          input#send_address ~ .validating {
            margin-top: -50px;
            margin-bottom: 22px;
            margin-right: 15px;
            align-self: flex-end;
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
