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
  FungibleAsset,
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
} from "@tallyho/tally-background/assets"
import logger from "@tallyho/tally-background/lib/logger"
import { Redirect, useLocation } from "react-router-dom"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { selectDefaultNetworkFeeSettings } from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectSlippageTolerance } from "@tallyho/tally-background/redux-slices/ui"
import { isNetworkBaseAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { NETWORKS_SUPPORTING_SWAPS } from "@tallyho/tally-background/constants"

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
import ApproveQuoteBtn from "./ApproveQuoteBtn"
import { isSameAsset, useSwapQuote } from "../utils/swap"

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
      (
        assetAmount
      ): assetAmount is CompleteAssetAmount<
        SmartContractFungibleAsset | FungibleAsset
      > =>
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

  const [sourceAsset, setSourceAsset] = useState(savedSellAsset)
  const [targetAsset, setTargetAsset] = useState(savedBuyAsset)
  const [sourceAmount, setSourceAmount] = useState(
    typeof savedSwapAmount !== "undefined" && "sellAmount" in savedSwapAmount
      ? savedSwapAmount.sellAmount
      : ""
  )
  const [targetAmount, setTargetAmount] = useState(
    typeof savedSwapAmount !== "undefined" && "buyAmount" in savedSwapAmount
      ? savedSwapAmount.buyAmount
      : ""
  )

  const buyAssets = useBackgroundSelector((state) => {
    // Some type massaging needed to remind TypeScript how these types fit
    // together.
    const knownAssets: AnyAsset[] = state.assets
    return knownAssets.filter(
      (asset): asset is SmartContractFungibleAsset | FungibleAsset => {
        // We don't want to buy the same asset we're selling.
        if (asset.symbol === sourceAsset?.symbol) {
          return false
        }

        if (isSmartContractFungibleAsset(asset)) {
          if (sameNetwork(asset.homeNetwork, currentNetwork)) {
            return true
          }
        }
        if (
          // Explicitly add a network's base asset.
          isNetworkBaseAsset(asset, currentNetwork)
        ) {
          return true
        }
        return false
      }
    )
  })

  const sellAssetAmounts = (
    ownedSellAssetAmounts.some(
      ({ asset }) =>
        typeof sourceAsset !== "undefined" && isSameAsset(asset, sourceAsset)
    )
      ? ownedSellAssetAmounts
      : ownedSellAssetAmounts.concat(
          typeof sourceAsset === "undefined"
            ? []
            : [
                {
                  asset: sourceAsset,
                  amount: 0n,
                  decimalAmount: 0,
                  localizedDecimalAmount: "0",
                },
              ]
        )
  ).filter(
    (sellAssetAmount) => sellAssetAmount.asset.symbol !== targetAsset?.symbol
  )

  useEffect(() => {
    if (typeof sourceAsset !== "undefined") {
      const isSelectedSellAssetInSellAssets = sellAssetAmounts.some(
        ({ asset }) => isSameAsset(asset, sourceAsset)
      )

      if (!isSelectedSellAssetInSellAssets) {
        sellAssetAmounts.push({
          asset: sourceAsset,
          amount: 0n,
          decimalAmount: 0,
          localizedDecimalAmount: "0",
        })
      }
    }
  }, [sourceAsset, sellAssetAmounts])

  const {
    loading: loadingQuote,
    loadingSourceAmount,
    loadingTargetAmount,
    quote,
    requestQuoteUpdate,
  } = useSwapQuote({
    initialSourceAsset: sourceAsset,
    initialTargetAsset: targetAsset,
    initialSwapSettings: {
      slippageTolerance: useBackgroundSelector(selectSlippageTolerance),
      networkSettings: useBackgroundSelector(selectDefaultNetworkFeeSettings),
    },
  })

  const inProgressApprovalContract = useBackgroundSelector(
    selectInProgressApprovalContract
  )
  const isApprovalInProgress =
    sourceAsset &&
    "contractAddress" in sourceAsset &&
    normalizeEVMAddress(inProgressApprovalContract || "0x") ===
      normalizeEVMAddress(sourceAsset?.contractAddress || "0x")

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

    if (typeof sourceAsset === "undefined") {
      logger.error(t("swap.error.noSellAsset"))
      return
    }
    if (typeof quote.approvalTarget === "undefined") {
      logger.error(t("swap.error.noApprovalTarget"))
      return
    }
    if (!isSmartContractFungibleAsset(sourceAsset)) {
      logger.error(t("swap.error.nonContractAsset"), sourceAsset)
      return
    }

    await dispatch(
      approveTransfer({
        assetContractAddress: sourceAsset.contractAddress,
        approvalTarget: quote.approvalTarget,
      })
    )
  }

  const updateSourceAsset = useCallback(
    (newSourceAsset: SmartContractFungibleAsset | FungibleAsset) => {
      setSourceAsset(newSourceAsset)
      setSourceAmount("")

      // Updating the source asset quotes the new source asset against the existing
      // target amount.
      if (newSourceAsset && targetAsset && targetAmount) {
        requestQuoteUpdate({
          type: "getSourceAmount",
          amount: targetAmount,
          sourceAsset: newSourceAsset,
          targetAsset,
        })
        requestQuoteUpdate.flush()
      }
    },
    [requestQuoteUpdate, targetAmount, targetAsset]
  )

  const updateTargetAsset = useCallback(
    (newTargetAsset: SmartContractFungibleAsset | FungibleAsset) => {
      setTargetAsset(newTargetAsset)
      setTargetAmount("")

      // Updating the target asset quotes the new target asset against the existing
      // source amount.
      if (sourceAsset && newTargetAsset && sourceAmount) {
        requestQuoteUpdate({
          type: "getTargetAmount",
          amount: sourceAmount,
          sourceAsset,
          targetAsset: newTargetAsset,
        })
        requestQuoteUpdate.flush()
      }
    },
    [sourceAmount, requestQuoteUpdate, sourceAsset]
  )

  const flipSwap = useCallback(() => {
    const [newSourceAsset, newTargetAsset] = [targetAsset, sourceAsset]
    const [newSourceAmount, newTargetAmount] = [targetAmount, sourceAmount]

    setSourceAsset(newSourceAsset)
    setTargetAsset(newTargetAsset)

    if (newSourceAmount) {
      setSourceAmount(newSourceAmount)
    }

    if (newTargetAmount) {
      setTargetAmount(newTargetAmount)
    }

    if (newSourceAmount && newSourceAsset && newTargetAsset)
      requestQuoteUpdate({
        type: "getTargetAmount",
        amount: targetAmount,
        sourceAsset: newSourceAsset,
        targetAsset: newTargetAsset,
      })
  }, [targetAmount, sourceAmount, targetAsset, sourceAsset, requestQuoteUpdate])

  const quoteAppliesToCurrentAssets =
    quote &&
    quote.sourceAsset === sourceAsset &&
    quote.targetAsset === targetAsset

  // Update if quote changes

  if (quote && !loadingQuote && quoteAppliesToCurrentAssets && quote.quote) {
    const { quote: newAmount, type } = quote

    if (type === "getSourceAmount" && newAmount !== sourceAmount) {
      setSourceAmount(newAmount)
    } else if (type === "getTargetAmount" && newAmount !== targetAmount) {
      setTargetAmount(newAmount)
    }
  }

  useEffect(() => {
    // Request a quote on mount
    if (sourceAsset && targetAsset && sourceAmount) {
      requestQuoteUpdate({
        type: "getTargetAmount",
        amount: sourceAmount,
        sourceAsset,
        targetAsset,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSwapSupportedByNetwork = () =>
    NETWORKS_SUPPORTING_SWAPS.has(selectedNetwork.chainID)

  if (!isSwapSupportedByNetwork()) {
    return <Redirect to="/" />
  }

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          isOpen={typeof finalQuote !== "undefined"}
          close={() => {
            dispatch(clearSwapQuote())
          }}
          size="large"
        >
          {quote &&
            typeof sourceAsset !== "undefined" &&
            typeof targetAsset !== "undefined" &&
            typeof finalQuote !== "undefined" && (
              <SwapQuote
                sellAsset={sourceAsset}
                buyAsset={targetAsset}
                finalQuote={finalQuote}
                swapTransactionSettings={quote.swapTransactionSettings}
              />
            )}
        </SharedSlideUpMenu>
        <div className="standard_width swap_wrap">
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
              <SharedAssetInput<SmartContractFungibleAsset | FungibleAsset>
                currentNetwork={currentNetwork}
                amount={sourceAmount}
                amountMainCurrency={
                  sourceAmount
                    ? quote?.priceDetails?.sellCurrencyAmount
                    : undefined
                }
                showPriceDetails
                isPriceDetailsLoading={loadingSourceAmount}
                assetsAndAmounts={sellAssetAmounts}
                selectedAsset={sourceAsset}
                isDisabled={loadingSourceAmount}
                onAssetSelect={updateSourceAsset}
                mainCurrencySign={mainCurrencySign}
                onAmountChange={(newAmount, error) => {
                  setSourceAmount(newAmount)

                  if (!error) {
                    requestQuoteUpdate({
                      type: "getTargetAmount",
                      amount: newAmount,
                      sourceAsset,
                      targetAsset,
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
              <SharedAssetInput<SmartContractFungibleAsset | FungibleAsset>
                currentNetwork={currentNetwork}
                amount={targetAmount}
                amountMainCurrency={
                  targetAmount
                    ? quote?.priceDetails?.buyCurrencyAmount
                    : undefined
                }
                priceImpact={quote?.priceDetails?.priceImpact}
                isPriceDetailsLoading={loadingTargetAmount}
                showPriceDetails
                // FIXME Merge master asset list with account balances.
                assetsAndAmounts={buyAssets.map((asset) => ({ asset }))}
                selectedAsset={targetAsset}
                isDisabled={loadingTargetAmount}
                showMaxButton={false}
                mainCurrencySign={mainCurrencySign}
                onAssetSelect={updateTargetAsset}
                onAmountChange={(newAmount, error) => {
                  setTargetAmount(newAmount)
                  if (error) {
                    requestQuoteUpdate.cancel()
                    return
                  }
                  if (newAmount) {
                    requestQuoteUpdate({
                      type: "getSourceAmount",
                      amount: newAmount,
                      sourceAsset,
                      targetAsset,
                    })
                  }
                }}
                label={t("swap.to")}
              />
            </div>
            <div className="settings_wrap">
              {!isEnabled(FeatureFlags.HIDE_SWAP_REWARDS) ? (
                <SwapRewardsCard />
              ) : null}
            </div>
            <div className="footer standard_width_padded">
              {quote?.needsApproval ? (
                <ApproveQuoteBtn
                  isApprovalInProgress={!!isApprovalInProgress}
                  isDisabled={isReadOnlyAccount || !quote}
                  onApproveClick={approveAsset}
                  loading={confirmationMenu}
                />
              ) : (
                <SharedButton
                  type="primary"
                  size="large"
                  isDisabled={
                    isReadOnlyAccount ||
                    !quote ||
                    !sourceAsset ||
                    !sourceAmount ||
                    !targetAsset ||
                    !targetAmount
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
          .swap_wrap {
            margin-top: -9px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
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
        `}
      </style>
    </>
  )
}
