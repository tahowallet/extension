// @ts-check
//
import React, { ReactElement } from "react"
import { CombinedAccountData } from "@tallyho/tally-background/redux-slices/accounts"
import WalletAssetListItem from "./WalletAssetListItem"

interface Props {
  assetAmounts: CombinedAccountData["assets"]
}

export default function WalletAssetList(props: Props): ReactElement {
  const { assetAmounts } = props
  if (!assetAmounts) return <></>
  return (
    <ul>
      {assetAmounts.map((assetAmount) => (
        <>
          {assetAmount.localizedDecimalValue !== "∞" ? (
            <WalletAssetListItem
              assetAmount={assetAmount}
              key={assetAmount.asset.symbol}
            />
          ) : null}
        </>
      ))}
    </ul>
  )
}
