import React from 'react';
import { registerRoute } from '../config/routes';
import CorePageWithTabs from '../components/Core/CorePageWithTabs';

function Earn() {
  return (
    <>
      <CorePageWithTabs>
        <span className="title">Earn</span>
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

registerRoute('earn', Earn);
