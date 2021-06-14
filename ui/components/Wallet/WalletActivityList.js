import React from 'react';
import WalletActivityListItem from './WalletActivityListItem';

export default function WalletActivityList() {
  return (
    <>
      <div className="wrap">
        {['', '', '', '', ''].map(() => (
          <WalletActivityListItem />
        ))}
      </div>
    </>
  );
}
