import React from 'react';
import TopMenuProtocolListItem from './TopMenuProtocolListItem';

export default function TopMenuProtocolList() {
  return (
    <>
      <div className="wrap standard_width">
        <TopMenuProtocolListItem isSelected />
        <ul>
          {['', '', ''].map(() => (
            <TopMenuProtocolListItem />
          ))}
        </ul>
        <div className="divider">
          <div className="divider_label">Testnet</div>
          <div className="divider_line" />
        </div>
        <ul>
          {['', '', '', ''].map(() => (
            <TopMenuProtocolListItem />
          ))}
        </ul>
      </div>
      <style jsx>
        {`
          .wrap {
            margin: 0 auto;
          }
          .divider {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            margin-top: 32px;
          }
          .divider_line {
            width: 286px;
            border-bottom: 1px solid var(--green-120);
            margin-left: 19px;
            position: absolute;
            right: 0px;
          }
          .divider_label {
            color: var(--green-40);
            font-family: Segment;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
          }
        `}
      </style>
    </>
  );
}
