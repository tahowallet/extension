import React from 'react';
import { registerRoute } from '../config/routes';
import CorePageWithTabs from '../components/Core/CorePageWithTabs';
import SharedAssetInput from '../components/Shared/SharedAssetInput';
import SendFeeSelectButton from '../components/Send/SendFeeSelectButton';

export default function Send() {
  return (
    <>
      <CorePageWithTabs>
        <div className="wrap">
          <div className="header">
            <div className="icon_activity_send_medium" />
            <div className="title">Send Asset</div>
          </div>
          <div className="form">
            <div className="form_input">
              <div className="label">Asset / Amount</div>
              <SharedAssetInput />
            </div>
            <div className="form_input">
              <div className="label">Send To:</div>
              <SharedAssetInput />
            </div>
            <div className="label">Network Fee/Speed</div>
            <div className="network_fee_group">
              <div className="network_fee_button">
                <SendFeeSelectButton />
              </div>
              <div className="network_fee_button">
                <SendFeeSelectButton />
              </div>
              <div className="network_fee_button">
                <SendFeeSelectButton />
              </div>
            </div>
            <div className="divider" />
          </div>
        </div>
      </CorePageWithTabs>
      <style jsx>
        {`
          .wrap {
            height: 100vh;
            width: 352px;
          }
          .icon_activity_send_medium {
            background: url('./images/activity_send_medium@2x.png');
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .title {
            height: 32px;
            color: #ffffff;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
          }
          .form_input {
            margin-bottom: 22px;
          }
          .network_fee_group {
            display: flex;
            margin-bottom: 29px;
          }
          .network_fee_button {
            margin-right: 16px;
          }
          .label {
            height: 17px;
            color: #667c7a;
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-bottom: 5px;
            margin-left: 7px;
          }
          .divider {
            width: 384px;
            border-bottom: 1px solid #000000;
            position: absolute;
            left: 0px;
          }
        `}
      </style>
    </>
  );
}
