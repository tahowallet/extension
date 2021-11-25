import React, { ReactElement, useEffect, useCallback, useState } from "react"
import { BigNumber, utils as ethersUtils } from "ethers"
import logger from "@tallyho/tally-background/lib/logger"
import {
  fetchTokens,
  fetchSwapPrices,
  setSwapTrade,
  setSwapAmount,
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
  const [openTokenMenu, setOpenTokenMenu] = useState(false)

  const { swapTrade, swapAmount, swapTokens } = useBackgroundSelector(
    (state) => {
      // The Redux serializer is clobbering our BigNumbers, so let's regenerate it
      const price = BigNumber.from(state.swap.tradingPair.price)

      return {
        swapTrade: { ...state.swap.tradingPair, price },
        swapAmount: state.swap.amount,
        swapTokens: state.swap.tokens,
      }
    }
  )

  // Fetch tokens from the 0x API whenever the swap page is loaded
  useEffect(() => {
    dispatch(fetchTokens())
  }, [dispatch])

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const displayAssets = combinedData.assets.map(({ asset }) => asset)

  const handleClick = useCallback(() => {
    setOpenTokenMenu((isCurrentlyOpen) => !isCurrentlyOpen)
  }, [])

  const fromAssetSelected = useCallback(
    async (token) => {
      logger.log("Asset selected!", token)

      dispatch(
        setSwapTrade({
          from: token,
          to: undefined,
          price: BigNumber.from("0"),
        })
      )

      await dispatch(fetchSwapPrices(token))
    },

    [dispatch]
  )

  const toAssetSelected = useCallback(
    (token) => {
      logger.log("Asset selected!", token)

      dispatch(
        setSwapTrade({
          from: swapTrade.from,
          to: token,
          price: ethersUtils.parseUnits(token.price, 18), // TODO: We need to know the actual number of decimals the token is using
        })
      )
    },

    [dispatch, swapTrade]
  )

  const fromAmountChanged = useCallback(
    (event) => {
      const inputValue = event.target.value.replace(/[^0-9.]/g, "") // Allow numbers and decimals only
      const floatValue = parseFloat(inputValue)

      // Basic validation to ensure we don't break the Ethers.js BigNumber parser
      if (Number.isNaN(floatValue) || swapTrade.price.isZero()) {
        dispatch(
          setSwapAmount({
            from: inputValue,
            to: "0",
          })
        )
      } else {
        dispatch(
          setSwapAmount({
            from: inputValue,
            to: ethersUtils
              .parseUnits(floatValue.toString(), 18) // TODO: Fetch decimals from 0x tokens API
              .div(swapTrade.price)
              .toString(),
          })
        )
      }
    },

    [dispatch, swapTrade]
  )

  const toAmountChanged = useCallback(
    (event) => {
      const inputValue = parseFloat(event.target.value)

      if (!Number.isNaN(inputValue) && !swapTrade.price.isZero()) {
        dispatch(
          setSwapAmount({
            /*
            The decimal math on this is messed up because of Ethers.js BigNumber library

            from: ethersUtils
              .parseUnits(inputValue.toString(), 18) // TODO: Actual decimals
              .mul(swap.price)
              .toString(),
            */
            from: "0",
            to: event.target.value,
          })
        )
      }
    },

    [dispatch, swapTrade]
  )

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          isOpen={openTokenMenu}
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
                assets={displayAssets}
                defaultToken={swapTrade.from}
                onAssetSelected={fromAssetSelected}
                onAmountChanged={fromAmountChanged}
                amount={swapAmount.from}
                label="Swap from:"
              />
            </div>
            <div className="icon_change" />
            <div className="form_input">
              <SharedAssetInput
                assets={swapTokens}
                defaultToken={swapTrade.to}
                onAssetSelected={toAssetSelected}
                onAmountChanged={toAmountChanged}
                amount={swapAmount.to}
                label="Swap to:"
              />
            </div>
            <div className="settings_wrap">
              <SwapTransactionSettings />
            </div>
            <div className="footer standard_width_padded">
              {swapTrade.from && swapTrade.to ? (
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
