import React from 'react';
import { registerRoute } from '../config/routes';
import CorePage from '../components/Core/CorePage';
import SharedAssetIcon from '../components/Shared/SharedAssetIcon';
import SharedButton from '../components/Shared/SharedButton';
import WalletActivityList from '../components/Wallet/WalletActivityList';

export default function SingleAsset() {
  return (
    <>
      <CorePage>
        <div className="header standard_width">
          <div className="left">
            <div className="back_button">Back</div>
            <div className="asset_wrap">
              <SharedAssetIcon />
              <span className="asset_name">KEEP</span>
            </div>
            <div className="balance">125,137.00</div>
            <div className="usd_value">($127,237,318)</div>
          </div>
          <div className="right">
            <SharedButton
              type="primary"
              size="medium"
              label="Send"
              icon="send"
            />
            <SharedButton
              type="primary"
              size="medium"
              label="Swap"
              icon="swap"
            />
          </div>
        </div>
        <div className="sub_info_seperator_wrap standard_width">
          <div className="left">Asset is on: Arbitrum</div>
          <div className="right">Move to Ethereum</div>
        </div>
        <div className="label standard_width">Activity</div>
        <WalletActivityList />
      </CorePage>
      <style jsx>
        {`
          .sub_info_seperator_wrap {
            display: flex;
            border: 1px solid var(--green-120);
            border-left: 0px;
            border-right: 0px;
            padding-top: 8px;
            padding-bottom: 8px;
            box-sizing: border-box;
            color: var(--green-60);
            font-size: 14px;
            line-height: 16px;
            justify-content: space-between;
            margin-top: 23px;
            margin-bottom: 16px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header .right {
            height: 95px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .back_button {
            height: 16px;
            color: var(--green-40);
            font-size: 12px;
            font-weight: 500;
            line-height: 16px;
          }
          .asset_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            text-transform: uppercase;
            margin-left: 8px;
          }
          .asset_wrap {
            display: flex;
            align-items: center;
          }
          .balance {
            color: #fff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
          }
          .usd_value {
            width: 112px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 600;
            line-height: 24px;
            text-align: center;
          }
          .label {
            color: var(--green-40);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 8px;
          }
        `}
      </style>
    </>
  );
}

registerRoute('singleAsset', SingleAsset);
