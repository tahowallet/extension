import React from 'react';

export default function SwapAssetsHeader() {
  return (
    <h1 className="header">
      <span className="icon_activity_swap_medium" />
      Swap assets
      <style jsx>
        {`
          h1 {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
            height: 32px;
            color: #ffffff;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .icon_activity_swap_medium {
            background: url('./images/activity_swap_medium@2x.png');
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
        `}
      </style>
    </h1>
  );
}
