import React, { ReactElement, useEffect, useState, useRef } from "react"
import {
  fetchSwapData,
  clearSwapQuote,
  approveTransfer,
} from "@tallyho/tally-background/redux-slices/0x-swap"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/selectors"
import {
  AnyAsset,
  FungibleAsset,
  isFungibleAsset,
  isSmartContractFungibleAsset,
} from "@tallyho/tally-background/assets"
import { fixedPointNumberToString } from "@tallyho/tally-background/lib/fixed-point"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import logger from "@tallyho/tally-background/lib/logger"
import { useHistory } from "react-router-dom"
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

  const [confirmationMenu, setConfirmationMenu] = useState(false)

  const [sellAsset, setSellAsset] = useState<FungibleAsset | undefined>(
    undefined
  )
  const [sellAmount, setSellAmount] = useState("")
  const [buyAsset, setBuyAsset] = useState<FungibleAsset | undefined>(undefined)
  const [buyAmount, setBuyAmount] = useState("")
  const [needsApproval, setNeedsApproval] = useState(false)
  const [approvalTarget, setApprovalTarget] = useState<string | undefined>(
    undefined
  )

  const [sellAmountLoading, setSellAmountLoading] = useState(false)
  const [buyAmountLoading, setBuyAmountLoading] = useState(false)

  const latestQuoteRequest = useRef<
    Parameters<typeof fetchSwapData>[0] | undefined
  >(undefined)

  const finalQuote = useBackgroundSelector((state) => state.swap.finalQuote)

  useEffect(() => {
    // Clear any saved quote data when the swap page is opened
    dispatch(clearSwapQuote())
  }, [dispatch])

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const sellAssets = combinedData.assets
    .map(({ asset }) => asset)
    .filter(isFungibleAsset)
  const buyAssets = useBackgroundSelector((state) => {
    // Some type massaging needed to remind TypeScript how these types fit
    // together.
    const knownAssets: AnyAsset[] = state.assets
    return knownAssets.filter(isFungibleAsset)
  })

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

  const updateSwapData = async (
    changeSource: "sell" | "buy",
    amount: string
  ): Promise<void> => {
    // Swap amounts can't update unless both sell and buy assets are specified.
    if (typeof sellAsset === "undefined" || typeof buyAsset === "undefined") {
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
        // If there's no quote, clear loading states and abort.
        setBuyAmountLoading(false)
        setSellAmountLoading(false)
        setNeedsApproval(false)
        setApprovalTarget(undefined)
        latestQuoteRequest.current = undefined

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
                assets={sellAssets}
                defaultAsset={sellAsset}
                isDisabled={sellAmountLoading}
                onAssetSelect={setSellAsset}
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
                onAssetSelect={setBuyAsset}
                onAmountChange={(newAmount) => {
                  setBuyAmount(buyAmount)
                  updateSwapData("buy", newAmount)
                }}
                label="Swap to:"
              />
            </div>
            <div className="settings_wrap">
              <SwapTransactionSettings />
            </div>
            <div className="footer standard_width_padded">
              {needsApproval ? (
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
              )}
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
