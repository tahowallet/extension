import React, { useState } from 'react';
import { registerRoute } from '../config/routes';
import SharedButton from '../components/Shared/SharedButton';
import CorePage from '../components/Core/CorePage';
import SharedSlideUpMenu from '../components/Shared/SharedSlideUpMenu';
import SharedPanelSwitcher from '../components/Shared/SharedPanelSwitcher';

function SignTxModalContent() {
  const [panelNum, setPanelNum] = useState(0);

  return (
    <section>
      <h1 className="serif_header title">Swap assets</h1>
      <div className="primary_info_card">
        <span className="site">Uniswap</span>
        <span className="pre_post_label">Spend amount</span>
        <span className="amount">0.347 ETH</span>
        <span className="pre_post_label">$1413.11</span>
      </div>
      <SharedPanelSwitcher
        setPanelNum={setPanelNum}
        panelNum={panelNum}
        panelNames={['Details', 'Advanced']}
      />
      {panelNum === 0 ? <span>Network Fee/Speed</span> : null}

      <div className="footer_actions">
        <SharedButton
          label="Reject"
          iconSize="large"
          size="large"
          type="tertiary"
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
          .site {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: center;
            margin: 16px 0px;
          }
          .pre_post_label {
            width: 107px;
            height: 24px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
          }
          .amount {
            color: #fff;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            text-transform: uppercase;
            margin: 3px 0px;
          }
          .footer_actions {
            postion: fixed;
            bottom: 0px;
            display: flex;
            width: 352px;
            justify-content: space-between;
          }
        `}
      </style>
    </section>
  );
}

export default function SignTx() {
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false);

  function handleClick() {
    setOpenReceiveMenu(!openReceiveMenu);
  }

  return (
    <section>
      <SharedSlideUpMenu isOpen={openReceiveMenu} close={handleClick}>
        {SignTxModalContent()}
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
