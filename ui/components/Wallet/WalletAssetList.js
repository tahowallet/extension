import React from 'react';
import WalletAssetListItem from './WalletAssetListItem';

export default function WalletAssetList(props) {
  const { assets } = props;
  if (!assets) return false;
  return (
    <ul>
      {assets.map((asset) => (
        <WalletAssetListItem asset={asset} />
      ))}
    </ul>
  );
}
