import React, { ReactElement } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"

import {
  SmartContractFungibleAsset,
  SwappableAsset,
} from "@tallyho/tally-background/assets"

import DoggoAssetListItem from "./AssetListItem/DoggoAssetListItem"
import CommonAssetListItem from "./AssetListItem/CommonAssetListItem"

type Props = {
  assetAmount: CompleteAssetAmount<SwappableAsset>
  initializationLoadingTimeExpired: boolean
  onUntrustedAssetWarningClick?: (
    asset: CompleteAssetAmount<SmartContractFungibleAsset>["asset"]
  ) => void
}

export default function WalletAssetListItem(props: Props): ReactElement {
  const {
    assetAmount,
    initializationLoadingTimeExpired,
    onUntrustedAssetWarningClick,
  } = props

  const isDoggoAsset = assetAmount.asset.symbol === "DOGGO"

  return (
    <li>
      {isDoggoAsset ? (
        <DoggoAssetListItem assetAmount={assetAmount} />
      ) : (
        <CommonAssetListItem
          assetAmount={assetAmount}
          initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          onUntrustedAssetWarningClick={onUntrustedAssetWarningClick}
        />
      )}
      <style jsx global>
        {`
          .asset_icon {
            mask-size: cover;
            background-color: var(--green-60);
            width: 12px;
            height: 12px;
          }
          .asset_list_item:hover .asset_icon:not(:hover) {
            background-color: var(--green-40);
          }
          .asset_icon:hover {
            background-color: var(--trophy-gold);
          }
          .asset_icon_earn {
            width: 22px;
            height: 22px;
            mask-image: url("./images/earn_tab@2x.png");
            margin-left: 10px;
            margin-right: -5px;
          }
          .asset_icon_gift {
            width: 22px;
            height: 22px;
            mask-image: url("./images/gift@2x.png");
          }
          .asset_icon_send {
            mask-image: url("./images/send_asset.svg");
          }
          .asset_icon_swap {
            mask-image: url("./images/swap_asset.svg");
          }
        `}
      </style>
    </li>
  )
}
