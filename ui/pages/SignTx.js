import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { registerRoute } from '../config/routes';
import SharedButton from '../components/Shared/SharedButton';
import CorePage from '../components/Core/CorePage';
import SharedSlideUpMenu from '../components/Shared/SharedSlideUpMenu';
import SharedAssetIcon from '../components/Shared/SharedAssetIcon';
import SharedPanelSwitcher from '../components/Shared/SharedPanelSwitcher';

function SignTxModalContent(props) {
  const { approveSpendOrSwap } = props;
  const [panelNum, setPanelNum] = useState(0);

  const approveAssetBlock = (
    <>
      <SharedAssetIcon size="small" />
      <SharedAssetIcon size="small" />
      <span className="site">Uniswap</span>
      <span>Spend KEEP tokens </span>
      <span>Spend limit</span>
      <span>422,391,328.23 KEEP</span>
      <SharedButton label="Change limit" size="small" type="tertiary" />
    </>
  );

  const swapAssetBlock = (
    <>
      <span className="site">Uniswap</span>
      <span className="pre_post_label">Spend amount</span>
      <span className="amount">0.347 ETH</span>
      <span className="pre_post_label">$1413.11</span>
      <div className="asset_items_wrap">
        <div className="asset_item">
          <SharedAssetIcon size="small" />
          <span className="asset_name">ETH</span>
        </div>
        <div className="icon_switch" />
        <div className="asset_item">
          <span className="asset_name">ETH</span>
          <SharedAssetIcon size="small" />
        </div>
      </div>
      <style jsx>{`
        .site {
          color: #fff;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          text-align: center;
          padding: 15px 0px;
          width: 272px;
          border-bottom: 1px solid var(--green-120);
          margin-bottom: 15px;
        }
        .pre_post_label {
          width: 107px;
          height: 24px;
          color: var(--green-40);
          font-size: 16px
          line-height: 24px;
          text-align: center;
        }
        .amount {
          color: #fff;
          font-size: 28px;
          font-weight: 500;
          line-height: 30px;
          text-align: center;
          text-transform: uppercase;
          margin-top: 3px;
        }
        .asset_name {
          width: 28px;
          height: 17px;
          color: var(--green-20);
          font-size: 14px;
          line-height: 16px;
          text-align: right;
          text-transform: uppercase;
          margin: 0px 8px;
        }
        .asset_items_wrap {
          display: flex;
          margin-top: 14px;
        }
        .asset_item:nth-of-type(3) {
          justify-content: flex-end;
        }
        .icon_switch {
          background: url('./images/swap_asset.svg') center no-repeat;
          background-size: 12px 12px;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 3px solid var(--hunter-green);
          background-color: var(--green-95);
          margin-left: -11px;
          margin-right: -11px;
          z-index: 5;
          flex-grow: 1;
          flex-shrink: 0;
          margin-top: 9px;
        }
        .asset_item {
          width: 108px;
          height: 48px;
          border-radius: 4px;
          background-color: var(--green-95);
          padding: 8px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
        }
      `}</style>
    </>
  );

  return (
    <section>
      <h1 className="serif_header title">Swap assets</h1>
      <div className="primary_info_card">
        {approveSpendOrSwap === 'swap' ? swapAssetBlock : approveAssetBlock}
      </div>
      <SharedPanelSwitcher
        setPanelNum={setPanelNum}
        panelNum={panelNum}
        panelNames={['Details', 'Advanced']}
      />
      {panelNum === 0 ? (
        <div className="detail_items_wrap standard_width">
          <span className="detail_item">Network Fee/Speed</span>
        </div>
      ) : null}
      <div className="footer_actions">
        <SharedButton
          label="Reject"
          iconSize="large"
          size="large"
          type="secondary"
        />
        <SharedButton label="Confirm" iconSize="large" size="large" />
      </div>
      <style jsx>
        {`
          section {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .title {
            color: var(--trophy-gold);
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            text-align: center;
          }
          .primary_info_card {
            display: block;
            width: 352px;
            height: 232px;
            border-radius: 16px;
            background-color: var(--hunter-green);
            margin: 16px 0px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer_actions {
            position: fixed;
            bottom: 0px;
            display: flex;
            width: 100%;
            padding: 0px 16px;
            box-sizing: border-box;
            align-items: center;
            height: 80px;
            justify-content: space-between;
            box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
            background-color: var(--green-95);
          }
          .detail_item {
            width: 100%;
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
          }
          .detail_items_wrap {
            display: flex;
            margin-top: 21px;
          }
        `}
      </style>
    </section>
  );
}

SignTxModalContent.propTypes = {
  approveSpendOrSwap: PropTypes.oneOf(['swap', 'spend']),
};

export default function SignTx() {
  const [openReceiveMenu, setOpenReceiveMenu] = useState(true);

  function handleClick() {
    setOpenReceiveMenu(!openReceiveMenu);
  }

  return (
    <section>
      <SharedSlideUpMenu isOpen={openReceiveMenu} close={handleClick}>
        <SignTxModalContent approveSpendOrSwap="swap" />
      </SharedSlideUpMenu>
      <CorePage hasTabBar={false}>
        <SharedButton
          label="Swap sign"
          onClick={handleClick}
          size="medium"
          type="primary"
        />
      </CorePage>
      <style jsx>
        {`
          section {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-content: center;
            text-align: center;
            align-self: center;
          }
          .primary_info_card {
            display: block;
            width: 352px;
            height: 232px;
            border-radius: 16px;
            background-color: var(--hunter-green);
          }
        `}
      </style>
    </section>
  );
}

registerRoute('signTx', SignTx);
