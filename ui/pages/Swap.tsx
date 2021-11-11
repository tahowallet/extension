import React, { ReactElement, useCallback, useState } from "react"
import { BigNumber, utils as ethersUtils } from "ethers"
import { fetchJson } from "@ethersproject/web"
import logger from "@tallyho/tally-background/lib/logger"
import { Asset } from "@tallyho/tally-background/types"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import CorePage from "../components/Core/CorePage"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import SwapQoute from "../components/Swap/SwapQuote"
import SharedActivityHeader from "../components/Shared/SharedActivityHeader"
import SwapTransactionSettings from "../components/Swap/SwapTransactionSettings"
import { useBackgroundSelector } from "../hooks"

interface SwapAmount {
  from: string
  to: string
}

interface TradingPair {
  from?: Asset
  to?: Asset
  price: BigNumber
}

interface ZrxToken {
  symbol: string
  price: string
}

export default function Swap(): ReactElement {
  const [openTokenMenu, setOpenTokenMenu] = useState(false)
  const [swapTokens, setSwapTokens] = useState<Asset[]>([])
  const [swapAmount, setSwapAmount] = useState<SwapAmount>({
    from: "0",
    to: "0",
  })

  const [swap, setSwap] = useState<TradingPair>({
    from: undefined,
    to: undefined,
    price: BigNumber.from("0"),
  })

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const displayAssets = combinedData.assets.map(({ asset }) => asset)

  const handleClick = useCallback(() => {
    setOpenTokenMenu((isCurrentlyOpen) => !isCurrentlyOpen)
  }, [])

  const fromAssetSelected = useCallback(async (token) => {
    logger.log("Asset selected!", token)

    const apiData = await fetchJson(
      `https://api.0x.org/swap/v1/prices?sellToken=${token.symbol}&perPage=1000` // TODO: Handle pagination instead of requesting so many records?
    )

    setSwapTokens(() => {
      return apiData.records.map((zrxToken: ZrxToken) => {
        return { ...zrxToken, name: "" } // TODO: Populate this by using the assets redux slice?
      })
    })

    setSwap(() => {
      // Reset the state whenever the from token is changed, because the price data we get from 0x is based on the from token
      return {
        from: token,
        to: undefined,
        price: BigNumber.from("0"),
      }
    })

    logger.log(apiData)
  }, [])

  const toAssetSelected = useCallback(async (token) => {
    logger.log("Asset selected!", token)

    setSwap((currentState) => {
      return {
        from: currentState.from,
        to: token,
        price: ethersUtils.parseUnits(token.price, 18), // TODO: We need to know the actual number of decimals the token is using
      }
    })
  }, [])

  const fromInputChanged = useCallback(
    (event) => {
      setSwapAmount(() => {
        return {
          from: event.target.value,
          to: ethersUtils
            .parseUnits(event.target.value, 18)
            .div(swap.price)
            .toString(), // TODO: Actual decimals
        }
      })
    },

    [swap]
  )

  const toInputChanged = useCallback(
    (event) => {
      setSwapAmount(() => {
        return {
          from: ethersUtils
            .parseUnits(event.target.value, 18)
            .mul(swap.price)
            .toString(), // TODO: Actual decimals
          to: event.target.value,
        }
      })
    },

    [swap]
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
                onAssetSelected={fromAssetSelected}
                onInputChanged={fromInputChanged}
                amount={swapAmount.from}
                label="Swap from:"
              />
            </div>
            <div className="icon_change" />
            <div className="form_input">
              <SharedAssetInput
                assets={swapTokens}
                onAssetSelected={toAssetSelected}
                onInputChanged={toInputChanged}
                amountValue={swapAmount.to}
                label="Swap to:"
              />
            </div>
            <div className="settings_wrap">
              <SwapTransactionSettings />
            </div>
            <div className="footer standard_width_padded">
              {swap.from && swap.to ? (
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
