// @ts-check
//
import React from "react"
import PropTypes from "prop-types"
import WalletAssetListItem from "./WalletAssetListItem"

export default function WalletAssetList(props) {
  const { assetAmounts } = props
  if (!assetAmounts) return <></>
  return (
    <ul>
      {assetAmounts.map((assetAmount) => (
        <WalletAssetListItem
          assetAmount={assetAmount}
          key={assetAmount.asset.symbol}
        />
      ))}
    </ul>
  )
}

WalletAssetList.propTypes = {
  assetAmounts: PropTypes.arrayOf(WalletAssetListItem.propTypes.assetAmount)
    .isRequired,
}
