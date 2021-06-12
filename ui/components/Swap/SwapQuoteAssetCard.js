import React from 'react';
import SharedAssetIcon from '../Shared/SharedAssetIcon';

export default function SwapQuoteAssetCard() {
  return (
    <div className="card_wrap">
      <div className="top_label">You pay</div>
      <SharedAssetIcon />
      <div className="amount">0.342</div>
      <div className="asset_name">ETH</div>
      <style jsx>
        {`
          .card_wrap {
            width: 164px;
            height: 152px;
            border-radius: 4px;
            background-color: var(--green-95);
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
            flex-grow: 1;
          }
          .top_label {
            height: 17px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-top: 8px;
            margin-bottom: 15px;
          }
          .asset_name {
            height: 24px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: right;
            text-transform: uppercase;
          }
          .amount {
            height: 32px;
            color: #ffffff;
            font-family: Segment;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            margin-top: 4px;
          }
        `}
      </style>
    </div>
  );
}
