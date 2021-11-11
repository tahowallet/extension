// @ts-check
//
import React, { ReactElement } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import WalletAssetListItem from "./WalletAssetListItem"

interface Props {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(props: Props): ReactElement {
  const { assetAmounts, initializationLoadingTimeExpired } = props
  if (!assetAmounts) return <></>
  return (
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
  )
}
