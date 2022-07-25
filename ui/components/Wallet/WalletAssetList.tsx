// @ts-check

import React, { ReactElement } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import WalletAssetListItem from "./WalletAssetListItem"
import AssetWarningSlideUp from "./AssetWarningSlideUp"

type WalletAssetListProps = {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(
  props: WalletAssetListProps
): ReactElement {
  const { assetAmounts, initializationLoadingTimeExpired } = props
  if (!assetAmounts) return <></>
  return (
    <>
      <AssetWarningSlideUp
        assetName="KEEP"
        contractAddress="0x85eee30c52b0b379b046fb0f85f4f3dc3009afec"
      />
      <ul>
        {assetAmounts.map((assetAmount) => (
          <WalletAssetListItem
            assetAmount={assetAmount}
            key={assetAmount.asset.symbol}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          />
        ))}
        {!initializationLoadingTimeExpired && (
          <li className="loading">Digging deeper...</li>
        )}
        <style jsx>{`
          .loading {
            display: flex;
            justify-content: center;
            padding-top: 5px;
            padding-bottom: 40px;
            color: var(--green-60);
            font-size: 15px;
          }
        `}</style>
      </ul>
    </>
  )
}
