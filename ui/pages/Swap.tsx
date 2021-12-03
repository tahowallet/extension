import React, { ReactElement, useEffect, useCallback, useState } from "react"
import logger from "@tallyho/tally-background/lib/logger"
import {
  fetchSwapAssets,
  fetchSwapPrices,
  setSwapTrade,
  setSwapAmount,
  selectSwappableAssets,
} from "@tallyho/tally-background/redux-slices/0x-swap"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import CorePage from "../components/Core/CorePage"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import SwapQoute from "../components/Swap/SwapQuote"
import SharedActivityHeader from "../components/Shared/SharedActivityHeader"
import SwapTransactionSettings from "../components/Swap/SwapTransactionSettings"
import { useBackgroundDispatch, useBackgroundSelector } from "../hooks"

export default function Swap(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [openAssetMenu, setOpenAssetMenu] = useState(false)

  const { swap, sellAsset, buyAsset } = useBackgroundSelector((state) => {
    return {
      swap: state.swap,
      sellAsset: state.swap.sellAsset,
      buyAsset: state.swap.buyAsset,
    }
  })

  // Fetch assets from the 0x API whenever the swap page is loaded
  useEffect(() => {
    dispatch(fetchSwapAssets())
  }, [dispatch])

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const sellAssets = combinedData.assets.map(({ asset }) => asset)
  const buyAssets = useBackgroundSelector(selectSwappableAssets)

  const handleClick = useCallback(() => {
    setOpenAssetMenu((isCurrentlyOpen) => !isCurrentlyOpen)
  }, [])

  const fromAssetSelected = useCallback(
    async (asset) => {
      logger.log("Asset selected!", asset)

      dispatch(
        setSwapTrade({
          sellAsset: asset,
        })
      )

      await dispatch(fetchSwapPrices(asset))
    },

    [dispatch]
  )

  const toAssetSelected = useCallback(
    (asset) => {
      logger.log("Asset selected!", asset)

      dispatch(
        setSwapTrade({
          buyAsset: asset,
        })
      )
    },

    [dispatch]
  )

  const fromAmountChanged = useCallback(
    (amount) => {
      const inputValue = amount.replace(/[^0-9.]/g, "") // Allow numbers and decimals only
      const floatValue = parseFloat(inputValue)

      if (Number.isNaN(floatValue) || typeof buyAsset?.price === "undefined") {
        dispatch(
          setSwapAmount({
            sellAmount: inputValue,
            buyAmount: "0",
          })
        )
      } else {
        dispatch(
          setSwapAmount({
            sellAmount: inputValue,
            // TODO: Use a safe math library
            buyAmount: (floatValue / parseFloat(buyAsset.price)).toString(),
          })
        )
      }
    },

    [dispatch, buyAsset]
  )

  const toAmountChanged = useCallback(
    (amount) => {
      const inputValue = amount.replace(/[^0-9.]/g, "") // Allow numbers and decimals only
      const floatValue = parseFloat(inputValue)

      if (Number.isNaN(floatValue) || typeof buyAsset?.price === "undefined") {
        dispatch(
          setSwapAmount({
            sellAmount: "0",
            buyAmount: inputValue,
          })
        )
      } else {
        dispatch(
          setSwapAmount({
            // TODO: Use a safe math library
            sellAmount: (floatValue * parseFloat(buyAsset.price)).toString(),
            buyAmount: inputValue,
          })
        )
      }
    },

    [dispatch, buyAsset]
  )

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          isOpen={openAssetMenu}
          close={handleClick}
          size="large"
        >
          <SwapQoute />
        </SharedSlideUpMenu>
        <div className="standard_width">
          <SharedActivityHeader label="Swap Assets" activity="swap" />
          <div className="form">
            <div className="form_input">
              <SharedAssetInput
                assets={sellAssets}
                defaultAsset={sellAsset}
                onAssetSelect={fromAssetSelected}
                onAmountChange={fromAmountChanged}
                amount={swap.sellAmount}
                label="Swap from:"
              />
            </div>
            <div className="icon_change" />
            <div className="form_input">
              <SharedAssetInput
                assets={buyAssets}
                defaultAsset={buyAsset}
                onAssetSelect={toAssetSelected}
                onAmountChange={toAmountChanged}
                amount={swap.buyAmount}
                label="Swap to:"
              />
            </div>
            <div className="settings_wrap">
              <SwapTransactionSettings />
            </div>
            <div className="footer standard_width_padded">
              {sellAsset && buyAsset ? (
                <SharedButton type="primary" size="large" onClick={handleClick}>
                  Get final quote
                </SharedButton>
              ) : (
                <SharedButton
                  type="primary"
                  size="large"
                  isDisabled
                  onClick={handleClick}
                >
                  Review swap
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
