// @ts-check
//
import React, { ReactElement } from "react"
import { CombinedAccountData } from "@tallyho/tally-background/redux-slices/accounts"
import WalletAssetListItem from "./WalletAssetListItem"

interface Props {
  assetAmounts: CombinedAccountData["assets"]
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
    </ul>
  )
}
