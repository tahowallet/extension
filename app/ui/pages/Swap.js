import React from 'react';
import { registerRoute } from '../config/routes';
import CorePageWithTabs from '../components/Core/CorePageWithTabs';
import SharedAssetInput from '../components/Shared/SharedAssetInput';
import SharedButton from '../components/Shared/SharedButton';

function TransactionSettings() {
  return (
    <>
      <div className="wrap">
        <div className="label">
          Slippage tolerance
          <div className="info">1%</div>
        </div>
        <div className="label">
          Network Fee/Speed
          <div className="info">{'$24 / Fast <1min'}</div>
        </div>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 352px;
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            padding: 16px;
            box-sizing: border-box;
          }
          .label {
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            display: flex;
            justify-content: space-between;
            width: 100%;
          }
          .label:first-of-type {
            margin-bottom: 7px;
          }
          .info {
            color: var(--green-20);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-align: right;
          }
        `}
      </style>
    </>
  );
}

export default function Swap() {
  return (
    <>
      <CorePageWithTabs>
        <div className="wrap">
          <div className="header">
            <div className="icon_activity_swap_medium" />
            <div className="title">Swap assets</div>
          </div>
          <div className="form">
            <div className="form_input">
              <div className="label">
                Swap from: <div className="label_right">Max</div>
              </div>
              <SharedAssetInput />
            </div>
            <div className="icon_change" />
            <div className="form_input">
              <div className="label">
                Swap to: <div className="label_right">-</div>
              </div>
              <SharedAssetInput />
            </div>
            <div className="settings_wrap">
              <div className="label">Transaction settings</div>
              {TransactionSettings()}
            </div>

            <div className="footer standard_width">
              <SharedButton
                type="primary"
                size="large"
                label="Review swap"
                isDisabled
                disableIcon
              />
            </div>
          </div>
        </div>
      </CorePageWithTabs>
      <style jsx>
        {`
          .wrap {
            width: 352px;
          }
          .icon_activity_swap_medium {
            background: url('./images/activity_swap_medium@2x.png');
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
          .network_fee_group {
            display: flex;
            margin-bottom: 29px;
          }
          .network_fee_button {
            margin-right: 16px;
          }
          .label {
            height: 17px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-bottom: 5px;
            margin-left: 7px;
            display: flex;
            justify-content: space-between;
          }
          .label_right {
            margin-right: 6px;
          }
          .divider {
            width: 384px;
            border-bottom: 1px solid #000000;
            margin-left: -16px;
          }
          .total_amount_number {
            width: 150px;
            height: 32px;
            color: #e7296d;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .footer {
            display: flex;
            justify-content: center;
            margin-top: 24px;
            padding-bottom: 20px;
          }
          .total_label {
            width: 33px;
            height: 17px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .icon_change {
            background: url('./images/change@2x.png') center no-repeat;
            background-size: 20px 20px;
            width: 20px;
            height: 20px;
            padding: 8px;
            border: 3px solid var(--hunter-green);
            background-color: var(--green-95);
            border-radius: 70%;
            margin: 0 auto;
            margin-top: -5px;
            margin-bottom: -26px;
            position: relative;
          }
          .settings_wrap {
            margin-top: 16px;
          }
        `}
      </style>
    </>
  );
}

registerRoute('swap', Swap);
