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
  onUnverifiedAssetWarningClick?: (
    asset: CompleteAssetAmount<SmartContractFungibleAsset>["asset"],
  ) => void
}

export default function WalletAssetListItem(props: Props): ReactElement {
  const {
    assetAmount,
    initializationLoadingTimeExpired,
    onUnverifiedAssetWarningClick,
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
          onUnverifiedAssetWarningClick={onUnverifiedAssetWarningClick}
        />
      )}
      <style jsx global>
        {`
          .asset_list_item {
            --asset-icon-color: var(--green-60);
          }
          .asset_list_item:hover {
            --asset-icon-color: var(--green-40);
          }
          /* Icons take their colour from the row, or from a tile they sit on. */
          .asset_icon {
            mask-size: cover;
            background-color: var(--asset-icon-color);
            width: 12px;
            height: 12px;
            transition: background-color var(--fade);
          }
          /* An icon that is a button of its own, with no tile. */
          a.asset_icon:hover,
          button.asset_icon:hover {
            --asset-icon-color: var(--trophy-gold);
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
        `}
      </style>
    </li>
  )
}
