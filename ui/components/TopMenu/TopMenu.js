import React from 'react';
import TopMenuProtocolSwitcher from './TopMenuProtocolSwitcher';
import TopMenuProfileButton from './TopMenuProfileButton';

export default function TopMenu() {
  return (
    <>
      <div className="wrap standard_width">
        <TopMenuProtocolSwitcher />
        <TopMenuProfileButton />
      </div>
      <style jsx>
        {`
          .wrap {
            flex-shrink: 0;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
        `}
      </style>
    </>
  );
}
