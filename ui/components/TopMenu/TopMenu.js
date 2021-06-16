import React from 'react';
import TopMenuProtocolSwitcher from './TopMenuProtocolSwitcher';
import TopMenuProfileButton from './TopMenuProfileButton';

export default function TopMenu() {
  return (
    <nav className="standard_width">
      <TopMenuProtocolSwitcher />
      <TopMenuProfileButton />
      <style jsx>
        {`
          nav {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
        `}
      </style>
    </nav>
  );
}
