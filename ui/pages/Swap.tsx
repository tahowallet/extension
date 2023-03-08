import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  clearSwapQuote,
  approveTransfer,
  selectLatestQuoteRequest,
  selectInProgressApprovalContract,
  fetchSwapQuote,
} from "@tallyho/tally-background/redux-slices/0x-swap"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import {
  selectCurrentAccountBalances,
  selectCurrentAccountSigner,
  selectCurrentNetwork,
  selectMainCurrencySign,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  AnyAsset,
  isSmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"
import logger from "@tallyho/tally-background/lib/logger"
import { Redirect, useLocation } from "react-router-dom"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { selectDefaultNetworkFeeSettings } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectSlippageTolerance } from "@tallyho/tally-background/redux-slices/ui"
import { isBuiltInNetworkBaseAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import {
  NETWORKS_SUPPORTING_SWAPS,
  SECOND,
} from "@tallyho/tally-background/constants"

import CorePage from "../components/Core/CorePage"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import SwapQuote from "../components/Swap/SwapQuote"
import SharedActivityHeader from "../components/Shared/SharedActivityHeader"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"
import SwapRewardsCard from "../components/Swap/SwapRewardsCard"
import SharedIcon from "../components/Shared/SharedIcon"
import SharedBanner from "../components/Shared/SharedBanner"
import ReadOnlyNotice from "../components/Shared/ReadOnlyNotice"
import ApproveQuoteBtn from "../components/Swap/ApproveQuoteButton"
import { isSameAsset, useSwapQuote } from "../utils/swap"
import { useOnMount, usePrevious, useInterval } from "../hooks/react-hooks"
import SharedLoadingDoggo from "../components/Shared/SharedLoadingDoggo"
import SharedBackButton from "../components/Shared/SharedBackButton"

const REFRESH_QUOTE_INTERVAL = 10 * SECOND

export default function Swap(): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const location = useLocation<
    { symbol: string; contractAddress?: string } | undefined
  >()

  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  const accountBalances = useBackgroundSelector(selectCurrentAccountBalances)

  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  const isReadOnlyAccount = currentAccountSigner === ReadOnlyAccountSigner

  const mainCurrencySign = useBackgroundSelector(selectMainCurrencySign)

  // TODO We're special-casing ETH here in an odd way. Going forward, we should
  // filter by current chain and better handle network-native base assets
  const ownedSellAssetAmounts =
    accountBalances?.assetAmounts.filter(
      (assetAmount): assetAmount is CompleteAssetAmount<SwappableAsset> =>
        isSmartContractFungibleAsset(assetAmount.asset) ||
        assetAmount.asset.symbol === currentNetwork.baseAsset.symbol
    ) ?? []

  const {
    symbol: locationAssetSymbol,
    contractAddress: locationAssetContractAddress,
  } = location.state ?? {}
  const locationAsset = ownedSellAssetAmounts.find(
    ({ asset: candidateAsset }) => {
      if (typeof locationAssetContractAddress !== "undefined") {
        return (
          isSmartContractFungibleAsset(candidateAsset) &&
          normalizeEVMAddress(candidateAsset.contractAddress) ===
            normalizeEVMAddress(locationAssetContractAddress)
        )
      }
      return candidateAsset.symbol === locationAssetSymbol
    }
  )?.asset

  const [confirmationMenu, setConfirmationMenu] = useState(false)

  const savedQuoteRequest = useBackgroundSelector(selectLatestQuoteRequest)

  const {
    assets: { sellAsset: savedSellAsset, buyAsset: savedBuyAsset },
    amount: savedSwapAmount,
  } = (!locationAsset && savedQuoteRequest) || {
    // ^ If coming from an asset item swap button, let the UI start fresh
    assets: { sellAsset: locationAsset },
  }

  const [sellAsset, setSellAsset] = useState(savedSellAsset)
  const [buyAsset, setBuyAsset] = useState(savedBuyAsset)
  const [sellAmount, setSellAmount] = useState(
    typeof savedSwapAmount !== "undefined" && "sellAmount" in savedSwapAmount
      ? savedSwapAmount.sellAmount
      : ""
  )
  const [buyAmount, setBuyAmount] = useState(
    typeof savedSwapAmount !== "undefined" && "buyAmount" in savedSwapAmount
      ? savedSwapAmount.buyAmount
      : ""
  )

  const previousChainId = usePrevious(currentNetwork.chainID)

  if (previousChainId !== currentNetwork.chainID && (sellAsset || buyAsset)) {
    setSellAsset(undefined)
    setBuyAsset(undefined)
    setSellAmount("")
    setBuyAmount("")
  }

  const buyAssets = useBackgroundSelector((state) => {
    // Some type massaging needed to remind TypeScript how these types fit
    // together.
    const knownAssets: AnyAsset[] = state.assets
    return knownAssets.filter((asset): asset is SwappableAsset => {
      // We don't want to buy the same asset we're selling.
      if (asset.symbol === sellAsset?.symbol) {
        return false
      }

      if (isSmartContractFungibleAsset(asset)) {
        if (sameNetwork(asset.homeNetwork, currentNetwork)) {
          return true
        }
      }
      if (
        // Explicitly add a network's base asset.
        isBuiltInNetworkBaseAsset(asset, currentNetwork)
      ) {
        return true
      }
      return false
    })
  })

  const sellAssetAmounts = (
    ownedSellAssetAmounts.some(
      ({ asset }) =>
        typeof sellAsset !== "undefined" && isSameAsset(asset, sellAsset)
    )
      ? ownedSellAssetAmounts
      : ownedSellAssetAmounts.concat(
          typeof sellAsset === "undefined"
            ? []
            : [
                {
                  asset: sellAsset,
                  amount: 0n,
                  decimalAmount: 0,
                  localizedDecimalAmount: "0",
                },
              ]
        )
  ).filter(
    (sellAssetAmount) => sellAssetAmount.asset.symbol !== buyAsset?.symbol
  )

  useEffect(() => {
    if (typeof sellAsset !== "undefined") {
      const isSelectedSellAssetInSellAssets = sellAssetAmounts.some(
        ({ asset }) => isSameAsset(asset, sellAsset)
      )

      if (!isSelectedSellAssetInSellAssets) {
        sellAssetAmounts.push({
          asset: sellAsset,
          amount: 0n,
          decimalAmount: 0,
          localizedDecimalAmount: "0",
        })
      }
    }
  }, [sellAsset, sellAssetAmounts])

  const {
    loading: loadingQuote,
    loadingSellAmount,
    loadingBuyAmount,
    quote,
    requestQuoteUpdate,
  } = useSwapQuote({
    initialSwapSettings: {
      slippageTolerance: useBackgroundSelector(selectSlippageTolerance),
      networkSettings: useBackgroundSelector(selectDefaultNetworkFeeSettings),
    },
  })

  const inProgressApprovalContract = useBackgroundSelector(
    selectInProgressApprovalContract
  )
  const isApprovalInProgress =
    sellAsset &&
    "contractAddress" in sellAsset &&
    normalizeEVMAddress(inProgressApprovalContract || "0x") ===
      normalizeEVMAddress(sellAsset?.contractAddress || "0x")

  const finalQuote = useBackgroundSelector((state) => state.swap.finalQuote)

  /* We have to watch the state to determine when the quote is fetched */
  useEffect(() => {
    if (typeof finalQuote !== "undefined") {
      // Now open the asset menu
      setConfirmationMenu(true)
    }
  }, [finalQuote])

  const getFinalQuote = async () => {
    // The final quote requires a previous non-final quote having been
    // requested; this is also guarded at the button (by disabling the button).
    if (!quote) {
      return false
    }

    dispatch(fetchSwapQuote(quote.quoteRequest))

    return true
  }

  const approveAsset = async () => {
    if (!quote) return

    if (typeof sellAsset === "undefined") {
      logger.error(t("swap.error.noSellAsset"))
      return
    }
    if (typeof quote.approvalTarget === "undefined") {
      logger.error(t("swap.error.noApprovalTarget"))
      return
    }
    if (!isSmartContractFungibleAsset(sellAsset)) {
      logger.error(t("swap.error.nonContractAsset"), sellAsset)
      return
    }

    await dispatch(
      approveTransfer({
        assetContractAddress: sellAsset.contractAddress,
        approvalTarget: quote.approvalTarget,
      })
    )
  }

  const updateSellAsset = useCallback(
    (newSellAsset: SwappableAsset) => {
      setSellAsset(newSellAsset)
      setSellAmount("")

      // Updating the source asset quotes the new source asset against the existing
      // target amount.
      if (newSellAsset && buyAsset && buyAmount) {
        requestQuoteUpdate({
          type: "getSellAmount",
          amount: buyAmount,
          sellAsset: newSellAsset,
          buyAsset,
        })
        requestQuoteUpdate.flush()
      }
    },
    [requestQuoteUpdate, buyAmount, buyAsset]
  )

  const updateBuyAsset = useCallback(
    (newBuyAsset: SwappableAsset) => {
      setBuyAsset(newBuyAsset)
      setBuyAmount("")

      // Updating the target asset quotes the new target asset against the existing
      // source amount.
      if (sellAsset && newBuyAsset && sellAmount) {
        requestQuoteUpdate({
          type: "getBuyAmount",
          amount: sellAmount,
          sellAsset,
          buyAsset: newBuyAsset,
        })
        requestQuoteUpdate.flush()
      }
    },
    [sellAmount, requestQuoteUpdate, sellAsset]
  )

  const flipSwap = useCallback(() => {
    const [newSellAsset, newBuyAsset] = [buyAsset, sellAsset]
    const [newSellAmount, newBuyAmount] = [buyAmount, sellAmount]

    setSellAsset(newSellAsset)
    setBuyAsset(newBuyAsset)

    if (newSellAmount) {
      setSellAmount(newSellAmount)
    }

    if (newBuyAmount) {
      setBuyAmount(newBuyAmount)
    }

    if (newSellAmount && newSellAsset && newBuyAsset)
      requestQuoteUpdate({
        type: "getBuyAmount",
        amount: buyAmount,
        sellAsset: newSellAsset,
        buyAsset: newBuyAsset,
      })
  }, [buyAmount, sellAmount, buyAsset, sellAsset, requestQuoteUpdate])

  const quoteAppliesToCurrentAssets =
    quote &&
    sellAsset &&
    buyAsset &&
    isSameAsset(quote.sellAsset, sellAsset) &&
    isSameAsset(quote.buyAsset, buyAsset)

  // Update if quote changes

  const prevQuoteTimestamp = usePrevious(quote?.timestamp)

  if (
    quote &&
    !loadingQuote &&
    quote.timestamp !== prevQuoteTimestamp &&
    quoteAppliesToCurrentAssets &&
    quote.quote
  ) {
    const { quote: newAmount, type } = quote

    if (type === "getSellAmount" && newAmount !== sellAmount) {
      setSellAmount(newAmount)
    } else if (type === "getBuyAmount" && newAmount !== buyAmount) {
      setBuyAmount(newAmount)
    }
  }

  const [amountInputHasFocus, setAmountInputHasFocus] = useState(false)

  useInterval(() => {
    if (!isEnabled(FeatureFlags.SUPPORT_SWAP_QUOTE_REFRESH)) return

    const isRecentQuote =
      quote &&
      // Time passed since last quote
      Date.now() - quote.timestamp <= 3 * SECOND

    const skipRefresh =
      loadingQuote || (isRecentQuote && quoteAppliesToCurrentAssets)

    if (
      !skipRefresh &&
      !amountInputHasFocus &&
      sellAsset &&
      buyAsset &&
      (sellAmount || buyAmount)
    ) {
      const type = sellAmount ? "getBuyAmount" : "getSellAmount"
      const amount = sellAmount || buyAmount

      requestQuoteUpdate({
        type,
        amount,
        sellAsset,
        buyAsset,
      })
    }
  }, REFRESH_QUOTE_INTERVAL)

  useOnMount(() => {
    // Request a quote on mount
    if (sellAsset && buyAsset && sellAmount) {
      requestQuoteUpdate({
        type: "getBuyAmount",
        amount: sellAmount,
        sellAsset,
        buyAsset,
      })
    }
  })

  const isSwapSupportedByNetwork = () =>
    NETWORKS_SUPPORTING_SWAPS.has(selectedNetwork.chainID)

  if (!isSwapSupportedByNetwork()) {
    return <Redirect to="/" />
  }

  const quoteAppliesToCurrentAmounts =
    quote &&
    (quote.type === "getBuyAmount"
      ? sellAmount === quote.amount && buyAmount === quote.quote
      : buyAmount === quote.amount && sellAmount === quote.quote)

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          isOpen={typeof finalQuote !== "undefined"}
          close={() => {
            dispatch(clearSwapQuote())
          }}
          size="large"
          isDark
        >
          {quote &&
            typeof sellAsset !== "undefined" &&
            typeof buyAsset !== "undefined" &&
            typeof finalQuote !== "undefined" && (
              <SwapQuote
                sellAsset={sellAsset}
                buyAsset={buyAsset}
                finalQuote={finalQuote}
                swapTransactionSettings={quote.swapTransactionSettings}
              />
            )}
        </SharedSlideUpMenu>
        <div className="standard_width">
          <div className="back_button_wrap">
            <SharedBackButton path="/" />
          </div>
          <div className="header">
            <SharedActivityHeader label={t("swap.title")} activity="swap" />
            <ReadOnlyNotice isLite />
            {isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES) ? (
              <></>
            ) : (
              !isEnabled(FeatureFlags.HIDE_SWAP_REWARDS) && (
                // TODO: Add onClick function after design is ready
                <SharedIcon
                  icon="cog@2x.png"
                  width={20}
                  color="var(--green-60)"
                  hoverColor="#fff"
                  customStyles="margin: 17px 0 25px;"
                />
              )
            )}
          </div>
          {isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES) ? (
            <></>
          ) : (
            isEnabled(FeatureFlags.HIDE_SWAP_REWARDS) && (
              <SharedBanner
                id="swap_rewards"
                canBeClosed
                icon="notif-announcement"
                iconColor="var(--link)"
                customStyles="margin-bottom: 16px"
              >
                {t("swap.swapRewardsTeaser")}
              </SharedBanner>
            )
          )}
          <div className="form">
            <div className="form_input">
              <SharedAssetInput<SwappableAsset>
                currentNetwork={currentNetwork}
                amount={sellAmount}
                amountMainCurrency={
                  sellAmount
                    ? quote?.priceDetails?.sellCurrencyAmount
                    : undefined
                }
                showPriceDetails
                isPriceDetailsLoading={loadingQuote}
                assetsAndAmounts={sellAssetAmounts}
                selectedAsset={sellAsset}
                isDisabled={loadingSellAmount}
                onAssetSelect={updateSellAsset}
                onFocus={() => setAmountInputHasFocus(true)}
                onBlur={() => setAmountInputHasFocus(false)}
                mainCurrencySign={mainCurrencySign}
                onAmountChange={(newAmount, error) => {
                  setSellAmount(newAmount)

                  if (!error) {
                    requestQuoteUpdate({
                      type: "getBuyAmount",
                      amount: newAmount,
                      sellAsset,
                      buyAsset,
                    })
                  }
                }}
                label={t("swap.from")}
              />
            </div>
            <button
              className="icon_change"
              type="button"
              onClick={flipSwap}
              disabled={loadingQuote}
            >
              {t("swap.switchAssets")}
            </button>
            <div className="form_input">
              <SharedAssetInput<SwappableAsset>
                currentNetwork={currentNetwork}
                amount={buyAmount}
                amountMainCurrency={
                  buyAmount ? quote?.priceDetails?.buyCurrencyAmount : undefined
                }
                priceImpact={quote?.priceDetails?.priceImpact}
                isPriceDetailsLoading={loadingQuote}
                showPriceDetails
                // FIXME: Merge master asset list with account balances.
                assetsAndAmounts={buyAssets.map((asset) => ({ asset }))}
                selectedAsset={buyAsset}
                isDisabled={loadingBuyAmount}
                onFocus={() => setAmountInputHasFocus(true)}
                onBlur={() => setAmountInputHasFocus(false)}
                showMaxButton={false}
                mainCurrencySign={mainCurrencySign}
                onAssetSelect={updateBuyAsset}
                onAmountChange={(newAmount, error) => {
                  setBuyAmount(newAmount)
                  if (error) {
                    requestQuoteUpdate.cancel()
                    return
                  }
                  if (newAmount) {
                    requestQuoteUpdate({
                      type: "getSellAmount",
                      amount: newAmount,
                      sellAsset,
                      buyAsset,
                    })
                  }
                }}
                label={t("swap.to")}
              />
              <div className="loading_wrapper">
                {loadingQuote && sellAsset && buyAsset && (
                  <SharedLoadingDoggo
                    size={54}
                    message={t("swap.loadingQuote")}
                  />
                )}
              </div>
            </div>
            <div className="settings_wrap">
              {!isEnabled(FeatureFlags.HIDE_SWAP_REWARDS) ? (
                <SwapRewardsCard />
              ) : null}
            </div>
            <div className="footer standard_width_padded">
              {quoteAppliesToCurrentAssets && quote?.needsApproval ? (
                <ApproveQuoteBtn
                  isApprovalInProgress={!!isApprovalInProgress}
                  isDisabled={isReadOnlyAccount || !quote}
                  onApproveClick={approveAsset}
                  isLoading={confirmationMenu}
                />
              ) : (
                <SharedButton
                  type="primary"
                  size="large"
                  isDisabled={
                    isReadOnlyAccount ||
                    !quote ||
                    !quoteAppliesToCurrentAssets ||
                    !quoteAppliesToCurrentAmounts
                  }
                  onClick={getFinalQuote}
                  showLoadingOnClick={!confirmationMenu}
                >
                  {t("swap.getFinalQuote")}
                </SharedButton>
              )}
            </div>
          </div>
        </div>
      </CorePage>
      <style jsx>
        {`
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 13px;
          }
          .network_fee_group {
            display: flex;
            margin-bottom: 29px;
          }
          .label_right {
            margin-right: 6px;
          }
          .divider {
            width: 384px;
            border-bottom: 1px solid #000000;
            margin-left: -16px;
          }
          .total_amount_number {
            width: 150px;
            height: 32px;
            color: #e7296d;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }

          .loading_wrapper {
            min-height: 73.5px;
            margin: 16px 0 32px;
          }

          .footer {
            display: flex;
            justify-content: center;
            margin-top: 24px;
          }
          .total_label {
            width: 33px;
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .icon_change {
            display: block;
            background: url("./images/change@2x.png") center no-repeat;
            background-size: 20px 20px;
            width: 20px;
            height: 20px;
            padding: 8px;
            border: 3px solid var(--hunter-green);
            background-color: var(--green-95);
            border-radius: 70%;
            margin: 0 auto;
            margin-top: -5px;
            margin-bottom: -32px;
            position: relative;
            z-index: 1;
            font-size: 0;
          }
          .settings_wrap {
            margin-top: 16px;
          }
          .back_button_wrap {
            position: absolute;
            margin-left: -1px;
            margin-top: -4px;
            z-index: 10;
          }
        `}
      </style>
    </>
  )
}
