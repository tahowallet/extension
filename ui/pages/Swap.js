import React, { useState } from 'react';
import { registerRoute } from '../config/routes';
import CorePage from '../components/Core/CorePage';
import SharedAssetInput from '../components/Shared/SharedAssetInput';
import SharedTooltip from '../components/Shared/SharedTooltip';
import SharedButton from '../components/Shared/SharedButton';
import SharedSlideUpMenu from '../components/Shared/SharedSlideUpMenu';
import SwapQoute from '../components/Swap/SwapQuote';
import SharedAssetsHeader from '../components/Shared/SharedAssetsHeader';
import SwapTransactionSettings from '../components/Swap/SwapTransactionSettings';

export default function Swap() {
  const [openTokenMenu, setOpenTokenMenu] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  function handleClick() {
    setOpenTokenMenu(!openTokenMenu);
  }

  function handleAssetSelect() {
    setSelectedCount(selectedCount + 1);
  }

  return (
    <>
      <CorePage>
        <SharedSlideUpMenu
          isOpen={openTokenMenu}
          close={handleClick}
          size="large"
        >
          <SwapQoute />
        </SharedSlideUpMenu>
        <div className="wrap">
          <SharedAssetsHeader label="Swap Assets" icon="swap" />
          <div className="form">
            <div className="form_input">
              <label className="label">
                Swap from: <span className="label_right">Max</span>
              </label>
              <SharedAssetInput onClick={handleAssetSelect} />
            </div>
            <div className="icon_change" />
            <div className="form_input">
              <label className="label">
                Swap to: <span className="label_right">-</span>
              </label>
              <SharedAssetInput onClick={handleAssetSelect} />
            </div>
            <div className="settings_wrap">
              <SwapTransactionSettings />
            </div>
            <div className="footer standard_width">
              {selectedCount < 2 ? (
                <SharedButton
                  type="primary"
                  size="large"
                  label="Review swap"
                  isDisabled
                  disableIcon
                  onClick={handleClick}
                />
              ) : (
                <SharedButton
                  type="primary"
                  size="large"
                  label="Get final quote"
                  disableIcon
                  onClick={handleClick}
                />
              )}
            </div>
          </div>
        </div>
      </CorePage>
      <style jsx>
        {`
          .wrap {
            width: 352px;
          }

          .network_fee_group {
            display: flex;
            margin-bottom: 29px;
          }
          .network_fee_button {
            margin-right: 16px;
          }

          // TODO: this css is duplicated, needs to be dry
          .label {
            height: 17px;
            color: var(--green-60);
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
