import React from "react"
import PropTypes from "prop-types"
import WalletAssetListItem from "./WalletAssetListItem"

export default function WalletAssetList(props) {
  const { assets } = props
  if (!assets) return false
  return (
    <ul>
      {assets.map((asset) => (
        <WalletAssetListItem asset={asset} />
      ))}
    </ul>
  )
}

WalletAssetList.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.object).isRequired,
}
