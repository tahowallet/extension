import React, { ReactElement, useCallback } from "react"
import { utils } from "ethers"

import {
  executeSwap,
  ZrxQuote,
} from "@tallyho/tally-background/redux-slices/0x-swap"
import { useHistory } from "react-router-dom"
import { FungibleAsset } from "@tallyho/tally-background/assets"
import SharedButton from "../Shared/SharedButton"
import SharedActivityHeader from "../Shared/SharedActivityHeader"
import SwapQuoteAssetCard from "./SwapQuoteAssetCard"
import SwapTransactionSettingsChooser, {
  SwapTransactionSettings,
} from "./SwapTransactionSettingsChooser"
import { useBackgroundDispatch } from "../../hooks"

type Props = {
  sellAsset: FungibleAsset
  buyAsset: FungibleAsset
  finalQuote: ZrxQuote
  swapTransactionSettings: SwapTransactionSettings
}

export default function SwapQuote({
  sellAsset,
  buyAsset,
  finalQuote,
  swapTransactionSettings,
}: Props): ReactElement {
  const dispatch = useBackgroundDispatch()

  const { sellAmount, buyAmount, sources } = {
    sellAmount: utils.formatUnits(finalQuote.sellAmount, sellAsset.decimals),
    buyAmount: utils.formatUnits(finalQuote.buyAmount, buyAsset.decimals),
    sources: finalQuote.sources.filter((source) => {
      if (parseFloat(source.proportion) > 0) {
        return true
      }

      return false
    }),
  }

  const history = useHistory()

  const handleConfirmClick = useCallback(async () => {
    const { gasPrice, ...quoteWithoutGasPrice } = finalQuote

    await dispatch(
      executeSwap({
        ...quoteWithoutGasPrice,
        gasPrice:
          swapTransactionSettings.networkSettings.values.maxFeePerGas.toString() ??
          gasPrice,
      })
    )

    history.push("/")
  }, [
    finalQuote,
    dispatch,
    swapTransactionSettings.networkSettings.values.maxFeePerGas,
    history,
  ])

  return (
    <section className="center_horizontal standard_width">
      <SharedActivityHeader label="Swap Assets" activity="swap" />
      <div className="quote_cards">
        <SwapQuoteAssetCard
          label="You pay"
          asset={sellAsset}
          amount={sellAmount}
        />
        <span className="icon_switch" />
        <SwapQuoteAssetCard
          label="You receive"
          asset={buyAsset}
          amount={buyAmount}
        />
      </div>
      <span className="label label_right">
        1 {sellAsset.symbol} = {finalQuote.price} {buyAsset.symbol}
      </span>
      <div className="settings_wrap">
        <SwapTransactionSettingsChooser
          isSettingsLocked
          swapTransactionSettings={swapTransactionSettings}
        />
      </div>
      <div className="exchange_section_wrap">
        <span className="top_label label">Exchange route</span>

        {sources.map((source) => (
          <div className="exchange_content standard_width" key={source.name}>
            <div className="left">
              {source.name.includes("Uniswap") && (
                <span className="icon_uniswap" />
              )}
              {source.name}
            </div>
            <div>{parseFloat(source.proportion) * 100}%</div>
          </div>
        ))}
      </div>
      <div className="confirm_button center_horizontal">
        <SharedButton type="primary" size="large" onClick={handleConfirmClick}>
          Continue Swap
        </SharedButton>
      </div>
      <style jsx>
        {`
          section {
            margin-top: -24px;
          }
          .icon_uniswap {
            background: url("./images/uniswap@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .approval_steps {
            height: 96px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            margin-top: 24px;
          }
          .icon_switch {
            background: url("./images/switch@2x.png") center no-repeat;
            background-size: 20px 20px;
            width: 40px;
            height: 32px;
            border-radius: 4px;
            border: 3px solid var(--hunter-green);
            background-color: var(--green-95);
            margin-left: -11px;
            margin-right: -11px;
            z-index: 5;
            flex-grow: 1;
            flex-shrink: 0;
          }
          .quote_cards {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .top_label {
            margin-bottom: 7px;
          }
          .label_right {
            float: right;
            margin-top: 16px;
          }
          .settings_wrap {
            margin-top: 44px;
          }
          .exchange_content {
            height: 40px;
            border-radius: 4px;
            background-color: var(--green-95);
            color: var(--green-20);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0px 16px;
            box-sizing: border-box;
          }
          .confirm_button {
            width: fit-content;
            margin-top: 36px;
          }
          .exchange_section_wrap {
            margin-top: 16px;
          }
          .left {
            display: flex;
            align-items: center;
          }
        `}
      </style>
    </section>
  )
}
