// @ts-check

import React, { ReactElement, useState } from "react"
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

  const [warnedAsset, setWarnedAsset] = useState<
    CompleteAssetAmount["asset"] | null
  >(null)

  if (!assetAmounts) return <></>

  return (
    <>
      <AssetWarningSlideUp
        asset={warnedAsset}
        close={() => setWarnedAsset(null)}
      />
      <ul>
        {assetAmounts.map((assetAmount) => (
          <WalletAssetListItem
            assetAmount={assetAmount}
            key={assetAmount.asset.symbol}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
            onUntrustedAssetWarningClick={(asset) => setWarnedAsset(asset)}
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
