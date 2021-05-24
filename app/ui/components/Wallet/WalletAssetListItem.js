import React from 'react';

export default function WalletAssetListItem() {
  return (
    <>
      <div className="wrap">
        <div className="left">
          <div className="token_icon_wrap">
            <div className="icon_eth" />
          </div>
          <div className="left_content">
            <div className="amount">
              <span className="bold_amount_count">2389.23</span>KEEP
            </div>
            <div className="price">$238.99</div>
          </div>
        </div>
        <div className="right">
          <div className="icon_send_asset" />
          <div className="icon_swap_asset" />
        </div>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 352px;
            height: 72px;
            border-radius: 16px;
            background-color: #193330;
            display: flex;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 16px;
            justify-content: space-between;
            align-items: center;
          }
          .left {
            display: flex;
          }
          .left_content {
            display: flex;
            flex-direction: column;
            height: 41px;
            justify-content: space-between;
          }
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            background-color: #002522;
            border-radius: 80px;
            margin-right: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon_eth {
            background: url('./images/eth@2x.png');
            background-size: 18px 29px;
            width: 18px;
            height: 29px;
          }
          .amount {
            height: 17px;
            color: #fefefc;
            font-size: 14px;
            font-weight: 400;
            font-style: normal;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-transform: uppercase;
          }
          .bold_amount_count {
            width: 70px;
            height: 24px;
            color: #fefefc;
            font-family: Segment;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-right: 4px;
          }
          .price {
            width: 58px;
            height: 17px;
            color: #99a8a7;
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .icon_send_asset {
            background: url('./images/send_asset.svg');
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .icon_swap_asset {
            background: url('./images/swap_asset.svg');
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .right {
            display: flex;
            width: 48px;
            justify-content: space-between;
            margin-right: 16px;
          }
        `}
      </style>
    </>
  );
}
