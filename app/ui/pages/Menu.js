import React from 'react';
import { registerRoute } from '../config/routes';
import CorePageWithTabs from '../components/Core/CorePageWithTabs';

export default function Menu() {
  return (
    <>
      <CorePageWithTabs>
        <div className="wrap">
          <span className="title">Menu</span>
        </div>
      </CorePageWithTabs>

      <style jsx>
        {`
          .wrap {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
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

registerRoute('menu', Menu);
