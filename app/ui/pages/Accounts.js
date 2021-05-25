import React from 'react';
import { registerRoute } from '../config/routes';
import CorePageWithTabs from '../components/Core/CorePageWithTabs';

export default function Accounts() {
  return (
    <>
      <CorePageWithTabs>
        <span className="title">Accounts</span>
      </CorePageWithTabs>
      <style jsx>
        {`
          .title {
            width: 375px;
            height: 46px;
            color: #fefefc;
            font-family: 'Quincy CF';
            font-size: 38px;
            font-weight: 400;
            text-align: center;
          }
        `}
      </style>
    </>
  );
}
