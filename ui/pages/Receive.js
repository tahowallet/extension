import React from 'react';
import SharedButton from '../components/Shared/SharedButton';

export default function Receive() {
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
          section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
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
