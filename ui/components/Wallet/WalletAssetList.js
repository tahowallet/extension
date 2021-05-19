import React from 'react';
import WalletAssetListItem from './WalletAssetListItem';

export default function WalletAssetList() {
  return (
    <>
      <div className="wrap">
        {['', '', '', '', ''].map(() => (
          <WalletAssetListItem />
        ))}
      </div>
    </>
  );
}
