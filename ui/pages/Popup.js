import React from 'react';
import { Router } from 'react-chrome-extension-router';
import Wallet from './Wallet';

import Accounts from './Accounts';
import Earn from './Earn';
import Menu from './Menu';
import Send from './Send';
import Swap from './Swap';

export default function Popup() {
  return (
    <Router>
      <Wallet />
    </Router>
  );
}
