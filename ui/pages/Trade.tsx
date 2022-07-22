import { OffChainAsset } from "@tallyho/tally-background/assets"
import { Wealthsimple } from "@tallyho/tally-background/constants/off-chain"
// import { selectCurrentAccountBalances } from "@tallyho/tally-background/redux-slices/selectors"
import React, { useCallback, useEffect, useState } from "react"
import transformOffChainAsset from "../services/utils"
import { useBackgroundSelector } from "../hooks"
import { OffChainService } from "../services/OffChainService"
import CorePage from "../components/Core/CorePage"
import SharedActivityHeader from "../components/Shared/SharedActivityHeader"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"

// eslint-disable-next-line import/prefer-default-export
export const Trade = () => {
  const [rawOffChainAssets, setRawOffChainAssets] = useState<OffChainAsset[]>(
    []
  )
  const [sellAsset, setSellAsset] = useState()
  const [buyAsset, setBuyAsset] = useState()
  const [sellAmount, setSellAmount] = useState("")
  const [buyAmount, setBuyAmount] = useState("")
  const [txHash, setTxHash] = useState(
    "0xd82da596bb57caf12be84359d0a3a53b0fbae91a519400c92f598edc1a2c60a2"
  )

  // const accountBalances = useBackgroundSelector(selectCurrentAccountBalances)
  // const assetAmounts = accountBalances?.assetAmounts

  const providerName =
    localStorage.getItem("offChainProvider") || Wealthsimple.name

  const offChainAssetAmounts = rawOffChainAssets.map((asset) =>
    transformOffChainAsset(asset, providerName)
  )

  const ownedSellAssetAmounts = offChainAssetAmounts

  const knownAssets = useBackgroundSelector((state) => state.assets)

  // TODO: filter out sell asset
  const buyAssets = knownAssets

  // TODO: filter out buy asset
  const sellAssetAmounts = ownedSellAssetAmounts

  useEffect(() => {
    const loadOffChainAssets = async () => {
      const response = await OffChainService.assets({
        userId: "foobar",
      })
      setRawOffChainAssets(response.assets)
    }
    loadOffChainAssets()
  }, [])

  const flipSwap = useCallback(() => {
    setSellAsset(buyAsset)
    setBuyAsset(sellAsset)

    setSellAmount(buyAmount)
  }, [buyAmount, buyAsset, sellAsset])

  const updateSellAsset = useCallback((asset) => {
    setSellAsset(asset)
  }, [])

  const updateBuyAsset = useCallback(
    (asset) => {
      setBuyAsset(asset)
      // temporary measure - mock buy amount
      if (sellAsset && sellAmount) {
        setBuyAmount((Number(sellAmount) * 1.5).toString())
      }
    },
    [sellAsset, sellAmount]
  )

  const confirmTrade = useCallback(async () => {
    // try {
    //   const response = await OffChainService.trade({})
    // } catch (e) {
    //   console.log("e", e)
    // }
    // BUG: response or error is not properly being logged
    // Mock the hash before the fix
    setTxHash(
      "0xd82da596bb57caf12be84359d0a3a53b0fbae91a519400c92f598edc1a2c60a2"
    )
  }, [])

  return (
    <>
      <CorePage>
        <div className="standard_width swap_wrap">
          <div className="header">
            <SharedActivityHeader label="Trade Assets" activity="swap" />
          </div>

          <div className="form">
            <div className="form_input">
              <SharedAssetInput
                amount={sellAmount}
                assetsAndAmounts={sellAssetAmounts}
                selectedAsset={sellAsset}
                isDisabled={false}
                onAssetSelect={updateSellAsset}
                onAmountChange={(newAmount) => {
                  setSellAmount(newAmount)
                  // Temporary measure - mock buy amount
                  if (sellAsset && buyAsset)
                    setBuyAmount((Number(newAmount) * 1.5).toString())
                }}
                label="Source currency"
              />
            </div>
            <button className="icon_change" type="button" onClick={flipSwap}>
              Switch Assets
            </button>
            <div className="form_input">
              <SharedAssetInput
                amount={buyAmount}
                selectedAsset={buyAsset}
                assetsAndAmounts={buyAssets.map((asset) => ({ asset }))}
                isDisabled={false}
                showMaxButton={false}
                onAssetSelect={updateBuyAsset}
                onAmountChange={(newAmount) => {
                  setBuyAmount(newAmount)
                }}
                label="Destination token"
              />
            </div>
            <div className="footer standard_width_padded">
              <SharedButton
                type="primary"
                size="large"
                isDisabled={!sellAsset || !sellAmount || !buyAsset}
                onClick={confirmTrade}
              >
                Trade
              </SharedButton>
            </div>
          </div>
          <div className="label">{txHash}</div>
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
          .label {
            color: var(--green-40);
            font-size: 16px;
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
