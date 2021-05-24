import React from 'react';
import { Router } from 'react-chrome-extension-router';
import Wallet from './Wallet';

export default function Popup() {
  return (
    <Router>
      <Wallet />
    </Router>
  );
}

