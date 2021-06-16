import React from 'react';
import WalletAssetListItem from './WalletAssetListItem';

export default function WalletAssetList() {
  return (
    <ul>
      {['', '', '', '', ''].map(() => (
        <WalletAssetListItem />
      ))}
    </ul>
  );
}
