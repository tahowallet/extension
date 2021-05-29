import React from 'react';
import { Router } from 'react-chrome-extension-router';
import Wallet from './Wallet';

import Accounts from '../pages/Accounts';
import Earn from '../pages/Earn';
import Menu from '../pages/Menu';
import Send from '../pages/Send';
import Swap from '../pages/Swap';

export default function Popup() {
  return (
    <Router>
      <Wallet />
    </Router>
  );
}
