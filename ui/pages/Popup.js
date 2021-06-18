import React from 'react';
import { Router } from 'react-chrome-extension-router';
import rootReducer from '../slices';
import Wallet from './Wallet';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import Accounts from './Accounts';
import Earn from './Earn';
import Menu from './Menu';
import Send from './Send';
import Swap from './Swap';

const store = configureStore({ reducer: rootReducer });

export default function Popup() {
  return (
    <Provider store={store}>
      <Router>
        <Wallet />
      </Router>
    </Provider>
  );
}
