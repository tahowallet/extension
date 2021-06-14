import React from 'react';

export default function SharedAssetItem() {
  return (
    <>
      <div className="token_group">
        <div className="left">
          <div className="token_icon_wrap">
            <div className="icon_eth" />
          </div>
          <div className="right">
            <div className="name">ETH</div>
            <div className="token_subtitle">Ethereum</div>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .token_group {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 46px;
            background-color: var(--hunter-green);
            border-radius: 80px;
            margin-right: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 24px;
          }
          .token_subtitle {
            width: 65px;
            height: 17px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-top: 5px;
          }
          .icon_eth {
            background: url('./images/eth@2x.png');
            background-size: 18px 29px;
            width: 18px;
            height: 29px;
          }
          .left {
            display: flex;
          }
        `}
      </style>
    </>
  );
}
