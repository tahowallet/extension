import React from 'react';
import WalletActivityListItem from './WalletActivityListItem';

export default function WalletActivityList() {
  return (
    <ul>
      {['', '', '', '', ''].map(() => (
        <WalletActivityListItem />
      ))}
    </ul>
  );
}
