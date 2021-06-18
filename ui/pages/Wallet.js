import React, { useState, useEffect } from 'react';
import { registerRoute } from '../config/routes';
import CorePageWithTabs from '../components/Core/CorePageWithTabs';
import WalletPanelSwitcher from '../components/Wallet/WalletPanelSwitcher';
import WalletAssetList from '../components/Wallet/WalletAssetList';
import WalletActivityList from '../components/Wallet/WalletActivityList';
import WalletAccountBalanceControl from '../components/Wallet/WalletAccountBalanceControl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAccount, accountSelector } from '../slices/account';

export default function Wallet() {
  const [panelNum, setPanelNum] = useState(0);
  const dispatch = useDispatch();
  //  accountLoading, hasWalletErrorCode
  const { account } = useSelector(accountSelector);

  useEffect(() => {
    dispatch(fetchAccount('0x176B8c8DD7657A011fcAc694364e69cF011980e9'));
  }, [true]);

  return (
    <div className="wrap">
      <CorePageWithTabs>
        <div className="page_content">
          <div className="section">
            <WalletAccountBalanceControl />
          </div>
          <div className="section">
            <WalletPanelSwitcher
              setPanelNum={setPanelNum}
              panelNum={panelNum}
            />
            <div className="panel">
              {panelNum === 0 ? (
                <WalletAssetList assets={account?.tokens} />
              ) : (
                <WalletActivityList activity={account?.activity} />
              )}
            </div>
          </div>
        </div>
      </CorePageWithTabs>
      <style jsx>
        {`
          .wrap {
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .page_content {
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100vw;
          }
          .panel {
            height: 284px;
            overflow: scroll;
            scrollbar-width: none;
            padding-top: 16px;
            box-sizing: border-box;
          }
          .panel::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
}

registerRoute('wallet', Wallet);
