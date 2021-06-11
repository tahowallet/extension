import React from 'react';

export default function SharedAssetIcon() {
  return (
    <div className="token_icon_wrap">
      <span className="icon_eth" />
      <style jsx>
        {`
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            background-color: var(--hunter-green);
            border-radius: 80px;
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
        `}
      </style>
    </div>
  );
}
