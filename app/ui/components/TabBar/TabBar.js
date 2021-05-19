import React from 'react';
import { getCurrent } from 'react-chrome-extension-router';
import { routes } from '../../config/routes';
import TabBarIcon from './TabBarIcon';

export default function TabBar() {
  const activeTabName =
    getCurrent()?.component?.name?.toLowerCase() || 'wallet';
  const tabs = ['accounts', 'wallet', 'swap', 'earn', 'menu'];

  return (
    <>
      <div className="wrap">
        {tabs.map((tabName) => (
          <TabBarIcon
            name={tabName}
            component={routes[tabName]}
            isActive={activeTabName === tabName}
          />
        ))}
      </div>
      <style jsx>
        {`
          .wrap {
            width: 100vw;
            height: 56px;
            background-color: #002522;
            display: flex;
            justify-content: space-around;
            padding: 0px 17px;
            box-sizing: border-box;
            align-items: center;
            flex-shrink: 0;
          }
        `}
      </style>
    </>
  );
}
