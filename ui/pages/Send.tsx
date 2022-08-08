import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  selectCurrentAccount,
  selectCurrentAccountBalances,
  selectCurrentAccountSigner,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  FungibleAsset,
  isFungibleAssetAmount,
} from "@tallyho/tally-background/assets"
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
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { selectETHAddressLookupCache } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import {
  checkIsEthereumContractAddress,
  clearETHAddressLookupCache,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedBackButton from "../components/Shared/SharedBackButton"
import SharedButton from "../components/Shared/SharedButton"
import {
  useAddressOrNameValidation,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks"
import SharedLoadingSpinner from "../components/Shared/SharedLoadingSpinner"
import ReadOnlyNotice from "../components/Shared/ReadOnlyNotice"
import SharedIcon from "../components/Shared/SharedIcon"

export default function Send(): ReactElement {
  const { t } = useTranslation()
  const isMounted = useRef(false)
  const location = useLocation<FungibleAsset>()
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? currentAccount.network.baseAsset
  )

  // Switch the asset being sent when switching between networks, but still use
  // location.state on initial page render - if it exists
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
    } else {
      setSelectedAsset(currentAccount.network.baseAsset)
    }
    // This disable is here because we don't necessarily have euqality-by-reference
    // due to how we persist the ui redux slice with webext-redux.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount.network.baseAsset.symbol])

  const [destinationAddress, setDestinationAddress] = useState<
    string | undefined
  >(undefined)
  const [amount, setAmount] = useState("")
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)

  const history = useHistory()

  const dispatch = useBackgroundDispatch()
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
        })
      )
    } finally {
      setIsSendingTransactionRequest(false)
    }

    history.push("/singleAsset", assetAmount.asset)
  }, [assetAmount, currentAccount, destinationAddress, dispatch, history])

  const {
    errorMessage: addressErrorMessage,
    isValidating: addressIsValidating,
    handleInputChange: handleAddressChange,
  } = useAddressOrNameValidation((value) =>
    setDestinationAddress(value?.address)
  )

  const contractLookupCache = useBackgroundSelector(selectETHAddressLookupCache)

  const isLoadingAddressDetails =
    currentAccount.network.family === "EVM" &&
    !!destinationAddress &&
    typeof contractLookupCache[destinationAddress] === "undefined"

  useEffect(() => {
    if (
      destinationAddress &&
      currentAccount.network.family === "EVM" &&
      !contractLookupCache[destinationAddress]
    ) {
      dispatch(checkIsEthereumContractAddress(destinationAddress))
    }
  }, [
    dispatch,
    contractLookupCache,
    currentAccount.network.family,
    destinationAddress,
    hasError,
  ])

  useEffect(() => {
    return () => {
      dispatch(clearETHAddressLookupCache())
    }
  }, [dispatch])

  return (
    <>
      <div className="standard_width">
        <div className="back_button_wrap">
          <SharedBackButton path="/" />
        </div>
        <h1 className="header">
          <span className="icon_activity_send_medium" />
          <div className="title">{t("wallet.sendAsset")}</div>
          <ReadOnlyNotice isLite />
        </h1>
        <div className="form">
          <div className="form_input">
            <SharedAssetInput
              label={t("wallet.assetAmount")}
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
            <label htmlFor="send_address">{t("wallet.sendTo")}</label>
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
          {destinationAddress && contractLookupCache[destinationAddress] && (
            <div className="token_warning">
              <div style={{ margin: "0 7.5px" }}>
                <SharedIcon
                  icon="icons/m/lock.svg"
                  width={32}
                  color="var(--hunter-green)"
                />
              </div>
              <p>
                This is a token address, sending assets will result in loss of
                funds.
              </p>
            </div>
          )}
          <div className="send_footer standard_width_padded">
            <SharedButton
              type="primary"
              size="large"
              isDisabled={
                currentAccountSigner === ReadOnlyAccountSigner ||
                Number(amount) === 0 ||
                destinationAddress === undefined ||
                hasError ||
                (!!destinationAddress &&
                  contractLookupCache[destinationAddress])
              }
              onClick={sendTransactionRequest}
              isFormSubmit
              isLoading={isSendingTransactionRequest || isLoadingAddressDetails}
            >
              {t("wallet.sendButton")}
            </SharedButton>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .token_warning {
            background: var(--attention);
            color: var(--hunter-green);
            border-radius: 5px;
            display: flex;
            align-items: center;
            font-weight: 600;
            padding: 10px 5px;
          }
          .token_warning p{
            margin 0;
          }
          .icon_activity_send_medium {
            background: url("./images/activity_send_medium@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .title {
            flex-grow: 1;
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
            margin-bottom: 14px;
          }
          .form {
            margin-top: 20px;
          }
          .label_right {
            margin-right: 6px;
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
          input#send_address::placeholder {
            color: var(--green-40);
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
        `}
      </style>
    </>
  )
}
