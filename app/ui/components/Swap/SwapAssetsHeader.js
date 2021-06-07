import React from 'react';

export default function SwapAssetsHeader() {
  return (
    <>
      <div className="header">
        <div className="icon_activity_swap_medium" />
        <div className="title">Swap assets</div>
      </div>
      <style jsx>
        {`
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
          }
          .icon_activity_swap_medium {
            background: url('./images/activity_swap_medium@2x.png');
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .title {
            height: 32px;
            color: #ffffff;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
        `}
      </style>
    </>
  );
}
