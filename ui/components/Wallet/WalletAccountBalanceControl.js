import React, { useState } from 'react';
import { Link } from 'react-chrome-extension-router';
import { routes } from '../../config/routes';
import SharedButton from '../Shared/SharedButton';
import SharedSlideUpMenu from '../Shared/SharedSlideUpMenu';

function Receive() {
  return (
    <section>
      <h1>
        <span className="icon_activity_send_medium" />
        Receive address
      </h1>
      <div className="sub_title">
        Only send Ethereum Mainnet compatible assets to this address.
      </div>
      <div className="qr_code">
        <div className="qr_code_image" />
      </div>
      <div className="copy_wrap">
        <SharedButton
          label="0x2A0e23...fdA0f6"
          icon="copy"
          size="medium"
          iconSize="large"
          type="primary"
        />
      </div>
      <style jsx>
        {`
          .receive_wrap {
            display: flex;
            align-items: center;
            flex-direction: column;
            margin-top: 24px;
          }
          h1 {
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            display: flex;
            align-items: center;
          }
          .sub_title {
            margin-top: 18px;
            width: 281px;
            height: 33px;
            color: var(--green-20);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-align: center;
          }
          .qr_code {
            width: 176px;
            height: 176px;
            border-radius: 16px;
            background-color: #ffffff;
            margin-top: 31px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr_code_image {
            background: url('./images/qr_code@2x.png');
            background-size: 128px 128px;
            width: 128px;
            height: 128px;
          }
          .copy_wrap {
            width: 215px;
            margin-top: 40px;
          }
          .icon_activity_send_medium {
            background: url('./images/activity_receive_medium@2x.png');
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
        `}
      </style>
    </section>
  );
}
export default function WalletAccountBalanceControl(props) {
  const { balance } = props;
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false);
  const [isRunAnimation, setRunAnimation] = useState(false);

  function handleClick() {
    setOpenReceiveMenu(!openReceiveMenu);
    setRunAnimation(true);
  }

  return (
    <>
      <SharedSlideUpMenu
        isOpen={openReceiveMenu}
        isRunAnimation={isRunAnimation}
        close={handleClick}
      >
        {Receive()}
      </SharedSlideUpMenu>
      <div className="wrap">
        <div className="balance_label">Total account balance</div>
        <span className="balance">
          <span className="dollar_sign">$</span>
          {balance}
        </span>
        <div className="send_receive_button_wrap">
          <Link component={routes['send']}>
            <SharedButton
              label="Send"
              icon="send"
              size="medium"
              type="primary"
            />
          </Link>
          <SharedButton
            label="Receive"
            onClick={handleClick}
            icon="receive"
            size="medium"
            type="primary"
          />
        </div>
      </div>
      <style jsx>
        {`
          .wrap {
            height: 146px;
            display: flex;
            justify-contnet: space-between;
            align-items: center;
            flex-direction: column;
          }
          .balance {
            height: 48px;
            color: #ffffff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
            display: flex;
            align-items: center;
          }
          .send_receive_button_wrap {
            margin-top: 18px;
            display: flex;
            width: 223px;
            justify-content: space-between;
          }
          .balance_label {
            width: 160px;
            height: 24px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
          }
          .dollar_sign {
            width: 14px;
            height: 32px;
            color: var(--green-40);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            margin-right: 4px;
            margin-left: -14px;
          }
        `}
      </style>
    </>
  );
}
