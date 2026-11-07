import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  selectCurrentAccountBalances,
  selectCurrentAccountNFTs,
  selectCurrentAnyAccount,
  selectCurrentAnyAccountSigner,
  selectCurrentAnyNetwork,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  FungibleAsset,
  isFungibleAssetAmount,
} from "@tallyho/tally-background/assets"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "@tallyho/tally-background/lib/fixed-point"
import { transferAsset } from "@tallyho/tally-background/redux-slices/assets"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/prices"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import {
  enrichAssetAmountWithMainCurrencyValues,
  isTrustedAsset,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { useHistory, useLocation } from "react-router-dom"
import classNames from "classnames"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { selectIsCurrentNetworkUnreachable } from "@tallyho/tally-background/redux-slices/selectors/networks"
import { sameAccountAddress } from "@tallyho/tally-background/lib/utils"
import { isEVMAddressOnNetwork } from "@tallyho/tally-background/accounts"
import { isHexString } from "@tallyho/tally-background/lib/utils/hex"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { NFTCached } from "@tallyho/tally-background/redux-slices/nfts"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedBackButton from "../components/Shared/SharedBackButton"
import NetworkUnreachableWarning from "../components/Shared/NetworkUnreachableWarning"
import SharedButton from "../components/Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import {
  PaymentDestination,
  useDestinationValidation,
} from "../hooks/validation-hooks"
import SharedLoadingSpinner from "../components/Shared/SharedLoadingSpinner"
import ReadOnlyNotice from "../components/Shared/ReadOnlyNotice"
import SharedIcon from "../components/Shared/SharedIcon"
import CorePage from "../components/Core/CorePage"

export default function Send(): ReactElement {
  const { t } = useTranslation()
  const isMounted = useRef(false)
  const location = useLocation<FungibleAsset>()
  // The network and account being shown, of any network family.
  const currentNetwork = useBackgroundSelector(selectCurrentAnyNetwork)
  // Stop the send here rather than letting the user fill out the whole form and
  // meet the same block on the signing screen. Reachability is tracked for
  // EVM RPC endpoints only.
  const isNetworkUnreachable =
    useBackgroundSelector(selectIsCurrentNetworkUnreachable) &&
    currentNetwork.family === "EVM"
  const currentAccount = useBackgroundSelector(selectCurrentAnyAccount)
  const currentAccountSigner = useBackgroundSelector(
    selectCurrentAnyAccountSigner,
  )

  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? currentNetwork.baseAsset,
  )

  const [assetType, setAssetType] = useState<"token" | "nft">("token")
  const [selectedNFT, setSelectedNFT] = useState<NFTCached | null>(null)

  const handleAssetSelect = (asset: FungibleAsset) => {
    setSelectedAsset(asset)
    setAssetType("token")
  }

  // Switch the asset being sent when switching between networks, but still use
  // location.state on initial page render - if it exists
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
    } else {
      setSelectedAsset(currentNetwork.baseAsset)
    }
    // This disable is here because we don't necessarily have equality-by-reference
    // due to how we persist the ui redux slice with webext-redux.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNetwork.baseAsset.symbol])

  const [destinationAddress, setDestinationAddress] = useState<
    PaymentDestination["address"] | undefined
  >(undefined)
  const [sendErrorMessage, setSendErrorMessage] = useState<string | undefined>()
  const [amount, setAmount] = useState("")

  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)

  const history = useHistory()

  const dispatch = useBackgroundDispatch()
  const balanceData = useBackgroundSelector(selectCurrentAccountBalances)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const nftCollections = useBackgroundSelector((state) => {
    if (isEnabled(FeatureFlags.SUPPORT_NFT_SEND)) {
      return selectCurrentAccountNFTs(state)
    }

    return []
  })

  const fungibleAssetAmounts =
    // Only look at fungible assets that have a balance greater than zero.
    // To be able to send an asset needs to be trusted or verified by the user.
    balanceData?.allAssetAmounts?.filter(
      (assetAmount): assetAmount is CompleteAssetAmount<FungibleAsset> =>
        isFungibleAssetAmount(assetAmount) &&
        assetAmount.decimalAmount > 0 &&
        isTrustedAsset(assetAmount.asset),
    )
  const assetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(state.prices, selectedAsset, mainCurrencySymbol),
  )

  const assetAmountFromForm = () => {
    const fixedPointAmount = parseToFixedPointNumber(amount.toString())
    if (typeof fixedPointAmount === "undefined") {
      return undefined
    }

    const decimalMatched = convertFixedPointNumber(
      fixedPointAmount,
      selectedAsset.decimals,
    )

    return enrichAssetAmountWithMainCurrencyValues(
      {
        asset: selectedAsset,
        amount: decimalMatched.amount,
      },
      assetPricePoint,
      2,
    )
  }

  const assetAmount = assetAmountFromForm()

  const sendTransactionRequest = useCallback(async () => {
    if (
      assetAmount === undefined ||
      destinationAddress === undefined ||
      currentAccount === undefined
    ) {
      return
    }

    // Pair the destination with the account's network family; the
    // validator only produces destinations of the current family.
    let toAddressNetwork: Parameters<
      typeof transferAsset
    >[0]["toAddressNetwork"]
    if (isEVMAddressOnNetwork(currentAccount)) {
      if (!isHexString(destinationAddress)) return
      toAddressNetwork = {
        address: destinationAddress,
        network: currentAccount.network,
      }
    } else {
      if (isHexString(destinationAddress)) return
      toAddressNetwork = {
        address: destinationAddress,
        network: currentAccount.network,
      }
    }

    setSendErrorMessage(undefined)
    let result: AsyncThunkFulfillmentType<typeof transferAsset> | undefined
    try {
      setIsSendingTransactionRequest(true)

      result = (await dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork,
          assetAmount,
        }),
      )) as unknown as AsyncThunkFulfillmentType<typeof transferAsset>
    } finally {
      setIsSendingTransactionRequest(false)
    }

    if (result?.success === false) {
      setSendErrorMessage(result.errorMessage)
      return
    }

    history.push("/singleAsset", assetAmount.asset)
  }, [assetAmount, currentAccount, destinationAddress, dispatch, history])

  const copyAddress = useCallback(() => {
    if (destinationAddress === undefined) {
      return
    }

    navigator.clipboard.writeText(destinationAddress)
    dispatch(setSnackbarMessage("Address copied to clipboard"))
  }, [destinationAddress, dispatch])

  const {
    rawValue: userAddressValue,
    errorMessage: addressErrorMessage,
    isValidating: addressIsValidating,
    handleInputChange: handleAddressChange,
  } = useDestinationValidation(
    useCallback(
      (value: PaymentDestination | undefined) => {
        setDestinationAddress(value?.address)
        // Lightning invoices may fix the amount; fill it in for the user.
        if (value?.amount !== undefined) {
          setAmount(
            fixedPointNumberToString({
              amount: value.amount,
              decimals: currentNetwork.baseAsset.decimals,
            }),
          )
        }
      },
      [currentNetwork.baseAsset.decimals],
    ),
  )

  // True if the user input a valid name (ENS, address book, etc) that we
  // resolved to an address.
  const resolvedNameToAddress =
    addressErrorMessage === undefined &&
    destinationAddress !== undefined &&
    !sameAccountAddress(destinationAddress, userAddressValue)

  return (
    <CorePage hasTopBar hasTabBar>
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
              currentNetwork={currentNetwork}
              label={t("wallet.assetAmount")}
              onAssetSelect={handleAssetSelect}
              assetsAndAmounts={fungibleAssetAmounts}
              onAmountChange={(value, errorMessage) => {
                setAmount(value)
                if (errorMessage) {
                  setHasError(true)
                } else {
                  setHasError(false)
                }
              }}
              onSelectNFT={(nft) => {
                setSelectedNFT(nft)
                setAssetType("nft")
              }}
              selectedAsset={selectedAsset ?? undefined}
              selectedNFT={(assetType === "nft" && selectedNFT) || undefined}
              amount={amount}
              showMaxButton={assetType !== "nft"}
              NFTCollections={
                isEnabled(FeatureFlags.SUPPORT_NFT_SEND) &&
                currentNetwork.family === "EVM"
                  ? nftCollections
                  : undefined
              }
            />
            {assetType === "token" && !hasError && (
              <div className="value">
                ${assetAmount?.localizedMainCurrencyAmount ?? "-"}
              </div>
            )}
          </div>
          <div className="form_input send_to_field">
            <label htmlFor="send_address">{t("wallet.sendTo")}</label>
            <input
              id="send_address"
              type="text"
              placeholder={
                currentNetwork.family === "SPARK"
                  ? t("wallet.sparkDestinationPlaceholder")
                  : "0x..."
              }
              spellCheck={false}
              onChange={(event) => handleAddressChange(event.target.value)}
              className={classNames({
                error: addressErrorMessage !== undefined,
                resolved_address: resolvedNameToAddress,
              })}
            />
            {addressIsValidating && (
              <p className="validating">
                <SharedLoadingSpinner />
              </p>
            )}
            {resolvedNameToAddress && (
              <button
                type="button"
                className="address"
                onClick={() => copyAddress()}
              >
                <SharedIcon
                  icon="icons/s/copy.svg"
                  width={14}
                  color="var(--green-60)"
                />
                {destinationAddress}
              </button>
            )}
            {addressErrorMessage !== undefined && (
              <p
                className="error"
                title="Note: UNS temporarily disabled for security reasons."
              >
                ⚠️ {addressErrorMessage}
              </p>
            )}
          </div>
          {sendErrorMessage !== undefined && (
            <p className="send_error" role="alert">
              ⚠️ {sendErrorMessage}
            </p>
          )}
          <div className="send_footer standard_width_padded">
            {/*
             * A disabled button with no explanation is its own kind of dead
             * end; this page is not the wallet view, so the banner is not on
             * screen to account for it.
             */}
            {isNetworkUnreachable && (
              <NetworkUnreachableWarning
                chainID={currentNetwork.chainID}
                tooltipVerticalPosition="top"
              />
            )}
            <SharedButton
              type="primary"
              size="large"
              isDisabled={
                currentAccountSigner === ReadOnlyAccountSigner ||
                (assetType === "token" && Number(amount) === 0) ||
                destinationAddress === undefined ||
                hasError ||
                isNetworkUnreachable
              }
              onClick={sendTransactionRequest}
              isFormSubmit
              isLoading={isSendingTransactionRequest}
            >
              {t("wallet.sendButton")}
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
            flex-grow: 1;
            height: 32px;
            color: var(--text-strong);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .back_button_wrap {
            position: absolute;
            margin-left: -1px;
            margin-top: -4px;
            z-index: var(--z-raised);
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            margin-top: 30px;
          }
          .form_input {
            position: relative;
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
            position: absolute;
            bottom: 8px;
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
            color: var(--text-strong);

            border-radius: 4px;
            background-color: var(--green-95);
            padding: 0px 16px;

            transition: padding-bottom 0.2s;
          }
          input#send_address::placeholder {
            color: var(--green-40);
          }
          input#send_address.resolved_address {
            font-size: 18px;
            font-weight: 600;
            padding-bottom: 16px;
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
          input#send_address ~ .address {
            display: flex;
            align-items: center;
            gap: 3px;

            color: var(--green-60);
            font-weight: 500;
            font-size: 12px;
            line-height: 20px;
            align-self: flex-start;
            text-align: start;
            margin-top: -30px;
            margin-left: 16px;
            margin-bottom: 5px;

            transition: color var(--fade);
          }
          input#send_address ~ .address:hover {
            color: var(--gold-80);
          }
          input#send_address ~ .address > :global(.icon) {
            transition: background-color var(--fade);
          }
          input#send_address ~ .address:hover > :global(.icon) {
            background-color: var(--gold-80);
          }
          input#send_address ~ .validating {
            margin-top: -50px;
            margin-bottom: 22px;
            margin-right: 15px;
            align-self: flex-end;
          }
          .send_error {
            color: var(--error);
            font-size: 14px;
            line-height: 20px;
            margin: 8px 0 0;
            overflow-wrap: anywhere;
          }
          .send_footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            /* Keeps the unreachable warning off the button it explains. */
            gap: 10px;
            margin-top: 21px;
            padding-bottom: 20px;
          }
        `}
      </style>
    </CorePage>
  )
}
