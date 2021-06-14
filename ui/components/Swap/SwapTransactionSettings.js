import React, { useState } from 'react';
import SharedSlideUpMenu from '../Shared/SharedSlideUpMenu';
import SharedButton from '../Shared/SharedButton';
import SharedNetworkFeeGroup from '../Shared/SharedNetworkFeeGroup';

export default function SwapTransactionSettings() {
  const [isSlideUpMenuOpen, setIsSlideUpMenuOpen] = useState(false);
  const [isRunAnimation, setRunAnimation] = useState(false);

  function handleClick() {
    setIsSlideUpMenuOpen(!isSlideUpMenuOpen);
    setRunAnimation(true);
  }

  return (
    <>
      <SharedSlideUpMenu
        isOpen={isSlideUpMenuOpen}
        isRunAnimation={isRunAnimation}
        size="small"
        close={() => {
          setIsSlideUpMenuOpen(false);
        }}
      >
        <div className="settings_wrap">
          <div className="row row_slippage">
            <div className="settings_label">Slippage tolerance</div>
            <SharedButton
              type="secondary"
              size="medium"
              label="1%"
              icon="chevron"
            />
          </div>
          <div className="row row_fee">
            <div className="settings_label settings_label_fee">
              Transaction Fee/Speed
            </div>
            <SharedNetworkFeeGroup />
          </div>
        </div>
      </SharedSlideUpMenu>
      <>
        <div className="top_label label">
          Transaction settings
          <button type="button" onClick={handleClick}>
            <div className="icon_cog" />
          </button>
        </div>
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
      </>
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
          .top_label {
            margin-bottom: 7px;
          }
          .row {
            padding: 15px 0px;
            display: flex;
            align-items: center;
          }
          .row_slippage {
            display: flex;
            justify-content: space-between;
            padding-bottom: 8px;
          }
          .row_fee {
            flex-direction: column;
            align-items: flex-start;
          }
          .settings_label {
            height: 17px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .settings_label_fee {
            margin-bottom: 7px;
          }
          .icon_cog {
            background: url('./images/cog@2x.png');
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .settings_wrap {
            width: 384px;
            height: 208px;
            background-color: var(--hunter-green);
            margin-top: 36px;
            padding: 0px 17px;
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
