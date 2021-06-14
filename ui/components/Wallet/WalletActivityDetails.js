import React from 'react';
import SharedAssetsHeader from '../Shared/SharedAssetsHeader';
import SharedButton from '../Shared/SharedButton';

function DetailRowItem(props) {
  const { label, value, valueDetail } = props;

  return (
    <>
      <li className="wrap">
        {label}
        <div className="right">
          {value}
          <div className="value_detail">{valueDetail}</div>
        </div>
      </li>
      <style jsx>
        {`
          .wrap {
            width: 100%;
            border-bottom: 1px solid var(--hunter-green);
            display: flex;
            justify-content: space-between;
            padding: 7px 0px;
            height: 24px;
            align-items: center;
          }
          .right {
            float: right;
            display: flex;
            align-items: flex-end;
          }
          .value_detail {
            color: var(--green-40);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
        `}
      </style>
    </>
  );
}

function DestinationCard() {
  return (
    <>
      <div className="wrap">
        <div className="sub_info from">From:</div>
        0x23kj...238y
        <div className="sub_info name">Foxhunter</div>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 160px;
            height: 96px;
            border-radius: 4px;
            background-color: var(--hunter-green);
            box-sizing: border-box;
            padding: 15px;
            flex-grow: 1;
            flex-shrink: 0;
          }
          .sub_info {
            width: 69px;
            height: 17px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .from {
            margin-bottom: 3px;
          }
          .name {
            margin-top: 10px;
          }
        `}
      </style>
    </>
  );
}

const DetailInfo = [
  {
    label: 'Timestamp',
    value: '03:00:12 PM',
    valueDetail: 'May-14-2021',
  },
  {
    label: 'Amount',
    value: '0.342 ETH',
    valueDetail: '($1409.11)',
  },
  {
    label: 'Transaction Fee',
    value: '0.00508 ETH',
    valueDetail: '($28,11)',
  },
  {
    label: 'Gas Price',
    value: '0.00000012 ETH',
    valueDetail: '(120 Gwei)',
  },
  {
    label: 'Total',
    value: '0.347 ETH',
    valueDetail: '($1437.11)',
  },
];

export default function WalletActivityDetails() {
  return (
    <div className="wrap center_horizontal">
      <div className="header">
        <SharedAssetsHeader label="Send Asset" icon="send" />
        <SharedButton
          type="tertiary"
          size="medium"
          label="Etherscan"
          icon="external"
          iconSize="large"
        />
      </div>
      <div className="destination_cards">
        {DestinationCard()}
        <div className="icon_change" />
        {DestinationCard()}
      </div>
      <ul>
        {DetailInfo.map((info) => {
          return <>{DetailRowItem(info)}</>;
        })}
      </ul>
      <div className="activity_log_wrap">
        <div className="activity_log_title">Activity Log</div>
        <ul>
          <li className="activity_log_item">
            <div className="activity_log_icon plus" />
            Tx created at 03:00 on 14/4/2021
          </li>
          <li className="activity_log_item">
            <div className="activity_log_icon arrow" />
            Tx submitted 03:01 on 14/4/2021
          </li>
          <li className="activity_log_item">
            <div className="activity_log_icon check" />
            Tx confirmed at 03:03 on 14/4/2021
          </li>
        </ul>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 352px;
            margin-top: -24px;
          }
          .destination_cards {
            display: flex;
            align-items: center;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 304px;
          }
          .icon_change {
            background: url('./images/chevron_right@2x.png') center no-repeat;
            background-size: 7px 10px;
            width: 35px;
            height: 35px;
            border: 3px solid var(--green-95);
            background-color: var(--hunter-green);
            border-radius: 70%;
            margin: 0 auto;
            margin-left: -5px;
            margin-right: -5px;
            position: relative;
            flex-grow: 1;
            flex-shrink: 0;
          }
          .activity_log_title {
            height: 24px;
            color: #ffffff;
            font-family: Segment;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-top: 27px;
            margin-bottom: 6px;
          }
          .activity_log_item {
            width: 100%;
            display: flex;
            align-items: center;
            height: 24px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            margin-bottom: 13px;
          }
          .activity_log_icon {
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-right: 8px;
            background-color: var(--green-60);
          }
          .plus {
            mask-image: url('./images/plus@2x.png');
          }
          .arrow {
            mask-image: url('./images/arrow@2x.png');
          }
          .check {
            mask-image: url('./images/check@2x.png');
            background-color: #22c480;
          }
        `}
      </style>
    </div>
  );
}
