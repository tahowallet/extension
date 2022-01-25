import React, {
  ReactElement,
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react"
import {
  fetchSwapData,
  clearSwapQuote,
  approveTransfer,
  selectLatestQuoteRequest,
  selectIsApprovalInProgress,
} from "@tallyho/tally-background/redux-slices/0x-swap"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors"
import {
  AnyAsset,
  AnyAssetAmount,
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
} from "@tallyho/tally-background/assets"
import { fixedPointNumberToString } from "@tallyho/tally-background/lib/fixed-point"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import logger from "@tallyho/tally-background/lib/logger"
import { useHistory, useLocation } from "react-router-dom"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import CorePage from "../components/Core/CorePage"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import SwapQuote from "../components/Swap/SwapQuote"
import SharedActivityHeader from "../components/Shared/SharedActivityHeader"
import SwapTransactionSettings from "../components/Swap/SwapTransactionSettings"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

export default function Swap(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  const location = useLocation<
    { symbol: string; contractAddress?: string } | undefined
  >()

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  // TODO Expand these to fungible assets by supporting direct ETH swaps,
  // TODO then filter by the current chain.
  const sellAssetAmounts = combinedData.assets.filter<
    CompleteAssetAmount<
      SmartContractFungibleAsset,
      AnyAssetAmount<SmartContractFungibleAsset>
    >
  >(
    (
      assetAmount
    ): assetAmount is CompleteAssetAmount<
      SmartContractFungibleAsset,
      AnyAssetAmount<SmartContractFungibleAsset>
    > => isSmartContractFungibleAsset(assetAmount.asset)
  )
  const buyAssets = useBackgroundSelector((state) => {
    // Some type massaging needed to remind TypeScript how these types fit
    // together.
    const knownAssets: AnyAsset[] = state.assets
    return knownAssets.filter(isSmartContractFungibleAsset)
  })

  const {
    symbol: locationAssetSymbol,
    contractAddress: locationAssetContractAddress,
  } = location.state ?? {}
  const locationAsset = sellAssetAmounts.find(({ asset: candidateAsset }) => {
    if (typeof locationAssetContractAddress !== "undefined") {
      return (
        isSmartContractFungibleAsset(candidateAsset) &&
        normalizeEVMAddress(candidateAsset.contractAddress) ===
          normalizeEVMAddress(locationAssetContractAddress)
      )
    }
    return candidateAsset.symbol === locationAssetSymbol
  })?.asset

  const [confirmationMenu, setConfirmationMenu] = useState(false)

  const savedQuoteRequest = useBackgroundSelector(selectLatestQuoteRequest)
  const {
    assets: { sellAsset: savedSellAsset, buyAsset: savedBuyAsset },
    amount: savedSwapAmount,
  } = savedQuoteRequest ?? {
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
  const [needsApproval, setNeedsApproval] = useState(false)
  const [approvalTarget, setApprovalTarget] = useState<string | undefined>(
    undefined
  )

  const isApprovalInProgress = useBackgroundSelector(selectIsApprovalInProgress)

  const [sellAmountLoading, setSellAmountLoading] = useState(false)
  const [buyAmountLoading, setBuyAmountLoading] = useState(false)

  const latestQuoteRequest = useRef<
    Parameters<typeof fetchSwapData>[0] | undefined
  >(savedQuoteRequest)

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
    if (typeof latestQuoteRequest.current === "undefined") {
      return false
    }

    dispatch(
      fetchSwapData({
        ...latestQuoteRequest.current,
        isFinal: true,
      })
    )

    return true
  }

  const approveAsset = async () => {
    if (typeof sellAsset === "undefined") {
      logger.error("Attempting to approve transfer without a sell asset.")
      return
    }
    if (typeof approvalTarget === "undefined") {
      logger.error("Attempting to approve transfer without an approval target.")
      return
    }
    if (!isSmartContractFungibleAsset(sellAsset)) {
      logger.error(
        "Attempting to approve transfer of a non-contract asset.",
        sellAsset
      )
      return
    }

    dispatch(
      approveTransfer({
        assetContractAddress: sellAsset.contractAddress,
        approvalTarget,
      })
    )

    history.push("/signTransaction")
  }

  const updateSwapData = useCallback(
    async (changeSource: "buy" | "sell", amount: string): Promise<void> => {
      if (changeSource === "sell") {
        setBuyAmount("")
      } else {
        setSellAmount("")
      }

      // Swap amounts can't update unless both sell and buy assets are specified.
      if (
        typeof sellAsset === "undefined" ||
        typeof buyAsset === "undefined" ||
        amount.trim() === ""
      ) {
        return
      }

      const quoteRequest: Parameters<typeof fetchSwapData>[0] = {
        isFinal: false,
        assets: { sellAsset, buyAsset },
        amount:
          changeSource === "sell"
            ? { sellAmount: amount }
            : { buyAmount: amount },
      }

      // If there's a different quote in progress, reset loading state.
      if (latestQuoteRequest.current !== quoteRequest) {
        setBuyAmountLoading(false)
        setSellAmountLoading(false)
      }

      if (changeSource === "sell") {
        setBuyAmountLoading(true)
      } else {
        setSellAmountLoading(true)
      }

      latestQuoteRequest.current = quoteRequest
      const { quote, needsApproval: quoteNeedsApproval } = ((await dispatch(
        fetchSwapData(quoteRequest)
      )) as unknown as AsyncThunkFulfillmentType<typeof fetchSwapData>) ?? {
        quote: undefined,
        needsApproval: false,
      }

      // Only proceed if the quote we just got is the same one we were looking for.
      if (latestQuoteRequest.current === quoteRequest) {
        if (typeof quote === "undefined") {
          // If there's no quote, clear states and abort.
          setBuyAmountLoading(false)
          setSellAmountLoading(false)
          setNeedsApproval(false)
          setApprovalTarget(undefined)
          latestQuoteRequest.current = undefined

          // TODO set an error on the buy or sell state.

          return
        }

        setNeedsApproval(quoteNeedsApproval)
        setApprovalTarget(quote.allowanceTarget)

        if (changeSource === "sell") {
          setBuyAmount(
            fixedPointNumberToString({
              amount: BigInt(quote.buyAmount),
              decimals: buyAsset.decimals,
            })
          )
          setBuyAmountLoading(false)
        } else {
          setSellAmount(
            fixedPointNumberToString({
              amount: BigInt(quote.sellAmount),
              decimals: sellAsset.decimals,
            })
          )
          setSellAmountLoading(false)
        }
      }
    },
    [buyAsset, dispatch, sellAsset]
  )

  const updateSellAsset = (asset: SmartContractFungibleAsset) => {
    setSellAsset(asset)
    // Updating the sell asset quotes the new sell asset against the existing
    // buy amount.
    updateSwapData("buy", buyAmount)
  }
  const updateBuyAsset = (asset: SmartContractFungibleAsset) => {
    setBuyAsset(asset)
    // Updating the buy asset quotes the new buy asset against the existing
    // sell amount.
    updateSwapData("sell", sellAmount)
  }

  useEffect(() => {
    if (typeof savedSwapAmount !== "undefined") {
      updateSwapData(
        "sellAmount" in savedSwapAmount ? "sell" : "buy",
        "sellAmount" in savedSwapAmount
          ? savedSwapAmount.sellAmount
          : savedSwapAmount.buyAmount
      )
    }

    dispatch(clearSwapQuote())
    // We only want to run this once, at component load, to make sure the flip of
    // the quote is set correctly. Further updates will happen through UI
    // interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          {typeof sellAsset !== "undefined" &&
          typeof buyAsset !== "undefined" &&
          typeof finalQuote !== "undefined" ? (
            <SwapQuote
              sellAsset={sellAsset}
              buyAsset={buyAsset}
              finalQuote={finalQuote}
            />
          ) : (
            <></>
          )}
        </SharedSlideUpMenu>
        <div className="standard_width">
          <SharedActivityHeader label="Swap Assets" activity="swap" />
          <div className="form">
            <div className="form_input">
              <SharedAssetInput
                amount={sellAmount}
                assets={sellAssetAmounts.map(({ asset }) => asset)}
                maxBalance={
                  sellAssetAmounts.find(({ asset }) => asset === sellAsset)
                    ?.decimalAmount
                }
                defaultAsset={sellAsset}
                disableDropdown={typeof locationAsset !== "undefined"}
                isDisabled={sellAmountLoading}
                onAssetSelect={updateSellAsset}
                onAmountChange={(newAmount) => {
                  setSellAmount(newAmount)
                  updateSwapData("sell", newAmount)
                }}
                label="Swap from:"
              />
            </div>
            <div className="icon_change" />
            <div className="form_input">
              <SharedAssetInput
                amount={buyAmount}
                assets={buyAssets}
                defaultAsset={buyAsset}
                isDisabled={buyAmountLoading}
                onAssetSelect={updateBuyAsset}
                onAmountChange={(newAmount) => {
                  setBuyAmount(newAmount)
                  updateSwapData("buy", newAmount)
                }}
                label="Swap to:"
              />
            </div>
            <div className="settings_wrap">
              <SwapTransactionSettings />
            </div>
            <div className="footer standard_width_padded">
              {
                // Would welcome an alternative here---this is pretty gnarly.
                // eslint-disable-next-line no-nested-ternary
                needsApproval ? (
                  isApprovalInProgress ? (
                    <SharedButton type="primary" size="large" isDisabled>
                      Waiting for approval transaction...
                    </SharedButton>
                  ) : (
                    <SharedButton
                      type="primary"
                      size="large"
                      isDisabled={
                        typeof latestQuoteRequest.current === "undefined" ||
                        sellAmountLoading ||
                        buyAmountLoading
                      }
                      onClick={approveAsset}
                      showLoadingOnClick={!confirmationMenu}
                    >
                      Approve asset
                    </SharedButton>
                  )
                ) : (
                  <SharedButton
                    type="primary"
                    size="large"
                    isDisabled={
                      typeof latestQuoteRequest.current === "undefined" ||
                      sellAmountLoading ||
                      buyAmountLoading
                    }
                    onClick={getFinalQuote}
                    showLoadingOnClick={!confirmationMenu}
                  >
                    Get final quote
                  </SharedButton>
                )
              }
            </div>
          </div>
        </div>
      </CorePage>
      <style jsx>
        {`
          .network_fee_group {
            display: flex;
            margin-bottom: 29px;
          }
          .network_fee_button {
            margin-right: 16px;
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
            padding-bottom: 20px;
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
          }
          .settings_wrap {
            margin-top: 16px;
          }
        `}
      </style>
    </>
  )
}
