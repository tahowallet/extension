import React from 'react';
import { Link } from 'react-chrome-extension-router';
import { routes } from '../../config/routes';
import SharedButton from '../Shared/SharedButton';

export default function WalletAccountBalanceControl() {
  return (
    <>
      <div className="wrap">
        <div className="balance_label">Total account balance</div>
        <span className="balance">
          <span className="dollar_sign">$</span>12,973.44
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
            width: 161px;
            height: 48px;
            color: #ffffff;
            font-family: Segment;
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
            color: #99a8a7;
            font-family: Segment;
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
          }
          .dollar_sign {
            width: 14px;
            height: 32px;
            color: #99a8a7;
            font-family: Segment;
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
